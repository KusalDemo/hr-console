import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LeadRepository } from '../repositories/lead.repository';
import { LeadScoringService } from './lead-scoring.service';
import { Lead, LeadStatus, LeadSource, LeadPriority } from '../entities/lead.entity';
import { CreateLeadDto, UpdateLeadDto, LeadResponseDto, ConvertLeadToContactDto } from '../dto';
import { ContactService } from '../../contacts/services/contact.service';
import { ContactRepository } from '../../contacts/repositories/contact.repository';
import { ContactCategory, ContactType } from '../../contacts/entities/contact.entity';

/**
 * Lead Service
 *
 * Manages leads with:
 * - Lead CRUD operations
 * - Lead scoring and routing
 * - Lead conversion to contacts
 * - Pipeline tracking
 * - Campaign attribution
 */
@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly leadScoringService: LeadScoringService,
    private readonly contactService: ContactService,
    private readonly contactRepository: ContactRepository,
  ) {}

  /**
   * Create a new lead
   */
  async createLead(createDto: CreateLeadDto, createdBy?: number): Promise<LeadResponseDto> {
    // Check if email already exists
    if (createDto.email) {
      const existing = await this.leadRepository.findByEmail(createDto.email);

      if (existing && !existing.isConverted) {
        throw new ConflictException(`Lead with email '${createDto.email}' already exists`);
      }
    }

    // Generate lead number if not provided
    let leadNumber = createDto.leadNumber;
    if (!leadNumber) {
      leadNumber = await this.generateLeadNumber();
    } else {
      const exists = await this.leadRepository.leadNumberExists(leadNumber);
      if (exists) {
        throw new ConflictException(`Lead number '${leadNumber}' already exists`);
      }
    }

    const lead = this.leadRepository.create({
      ...createDto,
      leadNumber,
      leadStatus: createDto.leadStatus || LeadStatus.NEW,
      leadSource: createDto.leadSource || LeadSource.OTHER,
      leadPriority: createDto.leadPriority || LeadPriority.MEDIUM,
      leadScore: createDto.leadScore || 0,
      expectedCloseDate: createDto.expectedCloseDate ? new Date(createDto.expectedCloseDate) : null,
      nextFollowUpDate: createDto.nextFollowUpDate ? new Date(createDto.nextFollowUpDate) : null,
      createdBy,
    });

    const saved = await this.leadRepository.save(lead);

    // Calculate initial score
    if (saved.leadScore === 0) {
      const calculatedScore = await this.leadScoringService.calculateLeadScore(
        saved,
        saved.organizationId || undefined,
      );
      saved.leadScore = calculatedScore;
      saved.lastScoreCalculation = new Date();
      await this.leadRepository.save(saved);
    }

    this.logger.log(`Created lead: ${saved.id} (${saved.fullName})`);

    const reloaded = await this.leadRepository.findById(saved.id);
    if (!reloaded) {
      throw new NotFoundException(`Lead not found after save`);
    }
    return LeadResponseDto.fromEntity(reloaded);
  }

  /**
   * Update a lead
   */
  async updateLead(
    id: number,
    updateDto: UpdateLeadDto,
    updatedBy?: number,
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (lead.isArchived) {
      throw new BadRequestException('Cannot update archived lead');
    }

    if (lead.isConverted) {
      throw new BadRequestException('Cannot update converted lead');
    }

    // Check for email conflicts if email is being changed
    if (updateDto.email && updateDto.email !== lead.email) {
      const existing = await this.leadRepository.findByEmail(updateDto.email);

      if (existing && existing.id !== id && !existing.isConverted) {
        throw new ConflictException(`Lead with email '${updateDto.email}' already exists`);
      }
    }

    const shouldRecalculateScore =
      updateDto.email !== undefined ||
      updateDto.companyName !== undefined ||
      updateDto.industry !== undefined ||
      updateDto.leadSource !== undefined ||
      updateDto.leadMetadata !== undefined;

    Object.assign(lead, {
      ...updateDto,
      expectedCloseDate: updateDto.expectedCloseDate
        ? new Date(updateDto.expectedCloseDate)
        : lead.expectedCloseDate,
      nextFollowUpDate: updateDto.nextFollowUpDate
        ? new Date(updateDto.nextFollowUpDate)
        : lead.nextFollowUpDate,
      lastContactDate: updateDto.lastContactDate
        ? new Date(updateDto.lastContactDate)
        : lead.lastContactDate,
      updatedBy,
    });

    const saved = await this.leadRepository.save(lead);

    // Recalculate score if relevant fields changed
    if (shouldRecalculateScore) {
      const calculatedScore = await this.leadScoringService.calculateLeadScore(
        saved,
        saved.organizationId || undefined,
      );
      saved.leadScore = calculatedScore;
      saved.lastScoreCalculation = new Date();
      await this.leadRepository.save(saved);
    }

    this.logger.log(`Updated lead: ${id}`);

    const reloaded = await this.leadRepository.findById(saved.id);
    if (!reloaded) {
      throw new NotFoundException(`Lead not found after save`);
    }
    return LeadResponseDto.fromEntity(reloaded);
  }

  /**
   * Get lead by ID
   */
  async getLeadById(id: number, includeConvertedContact = false): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id, includeConvertedContact);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return LeadResponseDto.fromEntity(lead, includeConvertedContact);
  }

  /**
   * Get lead by number
   */
  async getLeadByNumber(leadNumber: string): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findByNumber(leadNumber);

    if (!lead) {
      throw new NotFoundException(`Lead with number '${leadNumber}' not found`);
    }

    return LeadResponseDto.fromEntity(lead);
  }

  /**
   * Search leads
   */
  async searchLeads(
    searchTerm: string,
    organizationId?: number,
    includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.search(searchTerm, organizationId, includeArchived);

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get leads by status
   */
  async getLeadsByStatus(
    status: LeadStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.findByStatus(status, organizationId, includeArchived);

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get leads by source
   */
  async getLeadsBySource(
    source: LeadSource,
    organizationId?: number,
    includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.findBySource(source, organizationId, includeArchived);

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get leads by priority
   */
  async getLeadsByPriority(
    priority: LeadPriority,
    organizationId?: number,
    includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.findByPriority(
      priority,
      organizationId,
      includeArchived,
    );

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get leads by assigned user
   */
  async getLeadsByAssignedTo(
    assignedTo: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.findByAssignedTo(
      assignedTo,
      organizationId,
      includeArchived,
    );

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get leads by campaign
   */
  async getLeadsByCampaign(
    campaignId: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.findByCampaign(
      campaignId,
      organizationId,
      includeArchived,
    );

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get high-scoring leads
   */
  async getHighScoringLeads(
    minScore: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.findHighScoring(
      minScore,
      organizationId,
      includeArchived,
    );

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get leads needing follow-up
   */
  async getLeadsNeedingFollowUp(
    organizationId?: number,
    daysAhead = 7,
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.findNeedingFollowUp(organizationId, daysAhead);

    return leads.map((lead) => LeadResponseDto.fromEntity(lead));
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStatistics(organizationId?: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byPriority: Record<string, number>;
    averageScore: number;
    convertedCount: number;
    conversionRate: number;
  }> {
    return this.leadRepository.getPipelineStatistics(organizationId);
  }

  /**
   * Assign lead to user
   */
  async assignLead(id: number, assignedTo: number, updatedBy?: number): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (lead.isConverted) {
      throw new BadRequestException('Cannot assign converted lead');
    }

    lead.assignedTo = assignedTo;
    lead.updatedBy = updatedBy ?? null;

    const saved = await this.leadRepository.save(lead);

    this.logger.log(`Assigned lead ${id} to user ${assignedTo}`);

    const reloaded = await this.leadRepository.findById(saved.id);
    if (!reloaded) {
      throw new NotFoundException(`Lead not found after save`);
    }
    return LeadResponseDto.fromEntity(reloaded);
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(
    id: number,
    status: LeadStatus,
    reason?: string,
    updatedBy?: number,
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (lead.isConverted) {
      throw new BadRequestException('Cannot update status of converted lead');
    }

    lead.leadStatus = status;

    if (status === LeadStatus.LOST && reason) {
      lead.lossReason = reason;
    } else if (status === LeadStatus.DISQUALIFIED && reason) {
      lead.rejectionReason = reason;
    }

    if (status === LeadStatus.WON) {
      lead.actualCloseDate = new Date();
    }

    lead.updatedBy = updatedBy ?? null;

    const saved = await this.leadRepository.save(lead);

    this.logger.log(`Updated lead ${id} status to ${status}`);

    const reloaded = await this.leadRepository.findById(saved.id);
    if (!reloaded) {
      throw new NotFoundException(`Lead not found after save`);
    }
    return LeadResponseDto.fromEntity(reloaded);
  }

  /**
   * Recalculate lead score
   */
  async recalculateLeadScore(id: number): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    const calculatedScore = await this.leadScoringService.calculateLeadScore(
      lead,
      lead.organizationId || undefined,
    );

    lead.leadScore = calculatedScore;
    lead.lastScoreCalculation = new Date();

    const saved = await this.leadRepository.save(lead);

    this.logger.log(`Recalculated score for lead ${id}: ${calculatedScore}`);

    const reloaded = await this.leadRepository.findById(saved.id);
    if (!reloaded) {
      throw new NotFoundException(`Lead not found after save`);
    }
    return LeadResponseDto.fromEntity(reloaded);
  }

  /**
   * Convert lead to contact
   */
  async convertLeadToContact(
    id: number,
    convertDto: ConvertLeadToContactDto,
    convertedBy?: number,
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id, true);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (lead.isConverted) {
      throw new BadRequestException('Lead is already converted');
    }

    if (!lead.canBeConverted()) {
      throw new BadRequestException('Lead cannot be converted in current status');
    }

    // Check if contact already exists with this email
    let contactId: number | null = null;
    if (lead.email) {
      const existingContact = await this.contactRepository.findByEmail(lead.email);
      if (existingContact) {
        // Use existing contact
        contactId = existingContact.id;
      }
    }

    // Create contact if it doesn't exist
    if (!contactId) {
      const createContactDto = {
        fullName: lead.fullName,
        displayName: lead.displayName || lead.fullName,
        firstName: lead.firstName ?? undefined,
        lastName: lead.lastName ?? undefined,
        companyName: lead.companyName ?? undefined,
        email: lead.email ?? undefined,
        emailSecondary: lead.emailSecondary ?? undefined,
        phone: lead.phone ?? undefined,
        phoneMobile: lead.phoneMobile ?? undefined,
        website: lead.website ?? undefined,
        addressLine1: lead.addressLine1 ?? undefined,
        addressLine2: lead.addressLine2 ?? undefined,
        city: lead.city ?? undefined,
        state: lead.state ?? undefined,
        postalCode: lead.postalCode ?? undefined,
        country: lead.country ?? undefined,
        contactType: convertDto.contactType || ContactType.PERSON,
        contactCategory: convertDto.contactCategory || ContactCategory.CLIENT,
        contactSource: lead.leadSource ?? undefined,
        organizationId: lead.organizationId ?? undefined,
        industry: lead.industry,
        tags: lead.tags,
        notes: lead.notes || `Converted from lead ${lead.leadNumber}`,
        contactMetadata: {
          ...lead.leadMetadata,
          convertedFromLeadId: lead.id,
          convertedFromLeadNumber: lead.leadNumber,
          conversionDate: new Date().toISOString(),
        },
      };

      // Convert null to undefined for industry and tags fields
      const contactDtoForCreation = {
        ...createContactDto,
        industry: createContactDto.industry ?? undefined,
        tags: createContactDto.tags ?? undefined,
      };
      const createdContact = await this.contactService.createContact(contactDtoForCreation, convertedBy);
      contactId = createdContact.id;
    }

    // Update lead with conversion details
    lead.isConverted = true;
    lead.conversionDate = new Date();
    lead.convertedContactId = contactId;
    lead.conversionReason = convertDto.conversionReason || 'Manual conversion';
    lead.leadStatus = LeadStatus.WON;
    lead.actualCloseDate = new Date();
    lead.updatedBy = convertedBy ?? null;

    const saved = await this.leadRepository.save(lead);

    this.logger.log(`Converted lead ${id} to contact ${contactId}`);

    const reloaded = await this.leadRepository.findById(saved.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Lead with ID ${saved.id} not found after conversion`);
    }
    return LeadResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Archive lead
   */
  async archiveLead(id: number, archivedBy?: number): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (lead.isArchived) {
      throw new BadRequestException('Lead is already archived');
    }

    lead.isArchived = true;
    lead.archivedAt = new Date();
    lead.archivedBy = archivedBy ?? null;

    const saved = await this.leadRepository.save(lead);

    this.logger.log(`Archived lead: ${id}`);

    const reloaded = await this.leadRepository.findById(saved.id);
    if (!reloaded) {
      throw new NotFoundException(`Lead not found after save`);
    }
    return LeadResponseDto.fromEntity(reloaded);
  }

  /**
   * Generate unique lead number
   */
  private async generateLeadNumber(): Promise<string> {
    const prefix = 'LEAD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const leadNumber = `${prefix}-${timestamp}-${random}`;

    // Check if it exists (very unlikely but check anyway)
    const exists = await this.leadRepository.leadNumberExists(leadNumber);
    if (exists) {
      // Retry with new random
      return this.generateLeadNumber();
    }

    return leadNumber;
  }
}
