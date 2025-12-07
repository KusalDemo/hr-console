import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  SupportTicketRepository,
  TicketCategoryRepository,
  TicketSLARepository,
} from '../repositories';
import { SLATrackingService } from './sla-tracking.service';
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketSLA,
  TicketComment,
  CommentType,
  TicketTimeEntry,
} from '../entities';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateTicketCategoryDto,
  UpdateTicketCategoryDto,
  CreateTicketSLADto,
  UpdateTicketSLADto,
  SupportTicketResponseDto,
  TicketCategoryResponseDto,
  TicketSLAResponseDto,
  AddTicketCommentDto,
  AddTicketTimeEntryDto,
  AssignTicketDto,
  UpdateTicketStatusDto,
} from '../dto';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';

/**
 * Support Service
 *
 * Manages support ticket operations:
 * - Ticket CRUD
 * - Ticket assignment and routing
 * - Status workflow management
 * - SLA tracking
 * - Comments and attachments
 * - Time tracking
 * - Escalation handling
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly categoryRepository: TicketCategoryRepository,
    private readonly slaRepository: TicketSLARepository,
    private readonly slaTrackingService: SLATrackingService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;

    // Get the last ticket number for this year
    const lastTicket = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ticket.ticketNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }

  // ==================== Ticket Operations ====================

  /**
   * Create support ticket
   */
  async createTicket(
    createDto: CreateSupportTicketDto,
    requesterId: number,
  ): Promise<SupportTicketResponseDto> {
    this.logger.log(`Creating support ticket: ${createDto.subject}`);

    // Validate organization
    const organization = await this.organizationRepository.findById(createDto.organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
    }

    // Validate requester
    const requester = await this.employeeRepository.findById(requesterId);
    if (!requester) {
      throw new NotFoundException(`Requester not found: ${requesterId}`);
    }

    // Validate category if provided
    let category: TicketCategory | null = null;
    if (createDto.categoryId) {
      category = await this.categoryRepository.findById(createDto.categoryId);
      if (!category) {
        throw new NotFoundException(`Category not found: ${createDto.categoryId}`);
      }
    }

    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber();

    try {
      const ticket = this.ticketRepository.create({
        ticketNumber,
        subject: createDto.subject,
        description: createDto.description,
        status: TicketStatus.OPEN,
        priority: createDto.priority || TicketPriority.MEDIUM,
        categoryId: createDto.categoryId || null,
        organizationId: createDto.organizationId,
        requesterId,
        assignedToId: createDto.assignedToId || category?.defaultAssigneeId || null,
        tags: createDto.tags || null,
        customFields: createDto.customFields || null,
        metadata: createDto.metadata || null,
        createdBy: requesterId,
      });

      const saved = await this.ticketRepository.save(ticket);

      // Apply SLA if category has default SLA or organization has default SLA
      let sla: TicketSLA | null = null;
      if (category?.defaultSlaId) {
        sla = await this.slaRepository.findById(category.defaultSlaId);
      } else {
        sla = await this.slaRepository.findDefaultSLA(createDto.organizationId);
      }

      if (sla) {
        await this.slaTrackingService.applySLAToTicket(saved, sla);
      }

      // Auto-assign if category has default assignee
      if (category?.defaultAssigneeId && !createDto.assignedToId) {
        saved.assignedToId = category.defaultAssigneeId;
        saved.status = TicketStatus.ASSIGNED;
        await this.ticketRepository.save(saved);
      }

      return SupportTicketResponseDto.fromEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to create ticket: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(id: number): Promise<SupportTicketResponseDto> {
    const ticket = await this.ticketRepository.findById(id, true);
    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${id}`);
    }
    return SupportTicketResponseDto.fromEntity(ticket);
  }

  /**
   * Get ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string): Promise<SupportTicketResponseDto> {
    const ticket = await this.ticketRepository.findByTicketNumber(ticketNumber);
    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketNumber}`);
    }
    return SupportTicketResponseDto.fromEntity(ticket);
  }

  /**
   * Update ticket
   */
  async updateTicket(
    id: number,
    updateDto: UpdateSupportTicketDto,
    updatedBy?: number,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${id}`);
    }

    if (ticket.isClosed()) {
      throw new BadRequestException('Cannot update closed ticket');
    }

    try {
      Object.assign(ticket, {
        ...updateDto,
        updatedBy: updatedBy || null,
      });

      const saved = await this.ticketRepository.save(ticket);
      return SupportTicketResponseDto.fromEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to update ticket: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }

  /**
   * Assign ticket
   */
  async assignTicket(
    id: number,
    assignDto: AssignTicketDto,
    assignedBy: number,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${id}`);
    }

    // Validate assignee
    if (assignDto.assignedToId) {
      const assignee = await this.employeeRepository.findById(assignDto.assignedToId);
      if (!assignee) {
        throw new NotFoundException(`Assignee not found: ${assignDto.assignedToId}`);
      }
    }

    ticket.assignedToId = assignDto.assignedToId || null;
    ticket.status = assignDto.assignedToId ? TicketStatus.ASSIGNED : TicketStatus.OPEN;
    ticket.updatedBy = assignedBy;

    const saved = await this.ticketRepository.save(ticket);
    return SupportTicketResponseDto.fromEntity(saved);
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    id: number,
    statusDto: UpdateTicketStatusDto,
    updatedBy: number,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${id}`);
    }

    const newStatus = statusDto.status;

    // Validate status transition
    if (ticket.status === TicketStatus.CLOSED && newStatus !== TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot change status of closed ticket');
    }

    ticket.status = newStatus;
    ticket.updatedBy = updatedBy ?? null;

    // Set timestamps based on status
    if (newStatus === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
      await this.slaTrackingService.recordResolution(id);
    } else if (newStatus === TicketStatus.CLOSED && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }

    const saved = await this.ticketRepository.save(ticket);
    return SupportTicketResponseDto.fromEntity(saved);
  }

  /**
   * Add comment to ticket
   */
  async addComment(
    ticketId: number,
    commentDto: AddTicketCommentDto,
    authorId?: number,
  ): Promise<void> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    // Record first response if this is the first comment from support
    if (
      !ticket.firstResponseAt &&
      commentDto.commentType !== CommentType.PUBLIC &&
      authorId !== ticket.requesterId
    ) {
      await this.slaTrackingService.recordFirstResponse(ticketId);
    }

    const comment = this.dataSource.getRepository(TicketComment).create({
      ticketId,
      authorId: authorId || null,
      content: commentDto.content,
      commentType: commentDto.commentType || CommentType.PUBLIC,
      isCustomerComment: authorId === ticket.requesterId,
    });

    await this.dataSource.getRepository(TicketComment).save(comment);
  }

  /**
   * Add time entry to ticket
   */
  async addTimeEntry(
    ticketId: number,
    timeEntryDto: AddTicketTimeEntryDto,
    employeeId: number,
  ): Promise<void> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const timeEntry = this.dataSource.getRepository(TicketTimeEntry).create({
      ticketId,
      employeeId,
      date: timeEntryDto.date ? new Date(timeEntryDto.date) : new Date(),
      timeMinutes: timeEntryDto.timeMinutes,
      description: timeEntryDto.description || null,
      isBillable: timeEntryDto.isBillable || false,
      createdBy: employeeId,
    });

    await this.dataSource.getRepository(TicketTimeEntry).save(timeEntry);

    // Update ticket total time
    ticket.totalTimeMinutes += timeEntryDto.timeMinutes;
    await this.ticketRepository.save(ticket);
  }

  /**
   * Get tickets with pagination
   */
  async getTickets(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      categoryId?: number;
      organizationId?: number;
      assignedToId?: number;
      requesterId?: number;
      isEscalated?: boolean;
    },
  ): Promise<{ tickets: SupportTicketResponseDto[]; total: number }> {
    const result = await this.ticketRepository.findWithPagination(page, limit, filters);
    return {
      tickets: result.tickets.map((t) => SupportTicketResponseDto.fromEntity(t)),
      total: result.total,
    };
  }

  /**
   * Get tickets by requester
   */
  async getTicketsByRequester(requesterId: number): Promise<SupportTicketResponseDto[]> {
    const tickets = await this.ticketRepository.findByRequester(requesterId);
    return tickets.map((t) => SupportTicketResponseDto.fromEntity(t));
  }

  /**
   * Get tickets by assignee
   */
  async getTicketsByAssignee(assignedToId: number): Promise<SupportTicketResponseDto[]> {
    const tickets = await this.ticketRepository.findByAssignee(assignedToId);
    return tickets.map((t) => SupportTicketResponseDto.fromEntity(t));
  }

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(organizationId?: number): Promise<{
    total: number;
    open: number;
    closed: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number;
    slaCompliance: number;
  }> {
    return this.ticketRepository.getTicketStatistics(organizationId);
  }

  // ==================== Category Operations ====================

  /**
   * Create category
   */
  async createCategory(
    createDto: CreateTicketCategoryDto,
    createdBy?: number,
  ): Promise<TicketCategoryResponseDto> {
    // Validate organization if provided
    if (createDto.organizationId) {
      const organization = await this.organizationRepository.findById(createDto.organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
      }
    }

    try {
      const category = this.categoryRepository.create({
        name: createDto.name,
        description: createDto.description || null,
        organizationId: createDto.organizationId || null,
        defaultSlaId: createDto.defaultSlaId || null,
        defaultAssigneeId: createDto.defaultAssigneeId || null,
        displayOrder: createDto.displayOrder || 0,
        isActive: true,
        icon: createDto.icon || null,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.categoryRepository.save(category);
      return TicketCategoryResponseDto.fromEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to create category: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<TicketCategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category not found: ${id}`);
    }
    return TicketCategoryResponseDto.fromEntity(category);
  }

  /**
   * Update category
   */
  async updateCategory(
    id: number,
    updateDto: UpdateTicketCategoryDto,
    updatedBy?: number,
  ): Promise<TicketCategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category not found: ${id}`);
    }

    try {
      Object.assign(category, {
        ...updateDto,
        updatedBy: updatedBy || null,
      });

      const saved = await this.categoryRepository.save(category);
      return TicketCategoryResponseDto.fromEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to update category: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category not found: ${id}`);
    }

    // Soft delete
    category.isActive = false;
    await this.categoryRepository.save(category);
  }

  /**
   * Get categories
   */
  async getCategories(organizationId?: number | null): Promise<TicketCategoryResponseDto[]> {
    const categories = await this.categoryRepository.findByOrganization(organizationId || null);
    return categories.map((c) => TicketCategoryResponseDto.fromEntity(c));
  }

  // ==================== SLA Operations ====================

  /**
   * Create SLA
   */
  async createSLA(
    createDto: CreateTicketSLADto,
    createdBy?: number,
  ): Promise<TicketSLAResponseDto> {
    // Validate organization if provided
    if (createDto.organizationId) {
      const organization = await this.organizationRepository.findById(createDto.organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
      }
    }

    // If this is set as default, unset other defaults
    if (createDto.isDefault) {
      const existingDefault = await this.slaRepository.findDefaultSLA(createDto.organizationId);
      if (existingDefault) {
        existingDefault.isDefault = false;
        await this.slaRepository.save(existingDefault);
      }
    }

    try {
      const sla = this.slaRepository.create({
        name: createDto.name,
        description: createDto.description || null,
        organizationId: createDto.organizationId || null,
        firstResponseTime: createDto.firstResponseTime,
        firstResponseTimeUnit: createDto.firstResponseTimeUnit,
        resolutionTime: createDto.resolutionTime,
        resolutionTimeUnit: createDto.resolutionTimeUnit,
        businessHours: createDto.businessHours || null,
        businessHoursOnly: createDto.businessHoursOnly || false,
        priorityOverrides: createDto.priorityOverrides || null,
        escalationRules: createDto.escalationRules || null,
        isActive: true,
        isDefault: createDto.isDefault || false,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.slaRepository.save(sla);
      return TicketSLAResponseDto.fromEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to create SLA: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }

  /**
   * Get SLA by ID
   */
  async getSLAById(id: number): Promise<TicketSLAResponseDto> {
    const sla = await this.slaRepository.findById(id);
    if (!sla) {
      throw new NotFoundException(`SLA not found: ${id}`);
    }
    return TicketSLAResponseDto.fromEntity(sla);
  }

  /**
   * Update SLA
   */
  async updateSLA(
    id: number,
    updateDto: UpdateTicketSLADto,
    updatedBy?: number,
  ): Promise<TicketSLAResponseDto> {
    const sla = await this.slaRepository.findById(id);
    if (!sla) {
      throw new NotFoundException(`SLA not found: ${id}`);
    }

    // Handle default flag change
    if (updateDto.isDefault && !sla.isDefault) {
      const existingDefault = await this.slaRepository.findDefaultSLA(sla.organizationId ?? undefined);
      if (existingDefault && existingDefault.id !== id) {
        existingDefault.isDefault = false;
        await this.slaRepository.save(existingDefault);
      }
    }

    try {
      Object.assign(sla, {
        ...updateDto,
        updatedBy: updatedBy || null,
      });

      const saved = await this.slaRepository.save(sla);
      return TicketSLAResponseDto.fromEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to update SLA: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }

  /**
   * Delete SLA
   */
  async deleteSLA(id: number): Promise<void> {
    const sla = await this.slaRepository.findById(id);
    if (!sla) {
      throw new NotFoundException(`SLA not found: ${id}`);
    }

    // Soft delete
    sla.isActive = false;
    await this.slaRepository.save(sla);
  }

  /**
   * Get SLAs
   */
  async getSLAs(organizationId?: number | null): Promise<TicketSLAResponseDto[]> {
    const slas = await this.slaRepository.findByOrganization(organizationId || null);
    return slas.map((s) => TicketSLAResponseDto.fromEntity(s));
  }
}
