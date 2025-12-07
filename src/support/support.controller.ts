import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupportService, SLATrackingService } from './services';
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
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TicketStatus, TicketPriority } from './entities/support-ticket.entity';

/**
 * Support Controller
 * 
 * REST API endpoints for support ticket management:
 * - Ticket CRUD
 * - Ticket assignment and routing
 * - Status workflow
 * - SLA tracking
 * - Comments and time tracking
 * - Category and SLA management
 */
@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly slaTrackingService: SLATrackingService,
  ) {}

  // ==================== Ticket Endpoints ====================

  /**
   * Create support ticket
   * POST /support/tickets
   */
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() createDto: CreateSupportTicketDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicketResponseDto> {
    // Get employee ID from user (assuming user has employee relationship)
    // For now, using userId as requesterId - adjust based on your user/employee relationship
    return this.supportService.createTicket(createDto, user.userId);
  }

  /**
   * Get ticket by ID
   * GET /support/tickets/:id
   */
  @Get('tickets/:id')
  async getTicket(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.getTicketById(id);
  }

  /**
   * Get ticket by ticket number
   * GET /support/tickets/number/:ticketNumber
   */
  @Get('tickets/number/:ticketNumber')
  async getTicketByNumber(
    @Param('ticketNumber') ticketNumber: string,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.getTicketByNumber(ticketNumber);
  }

  /**
   * Get tickets with pagination
   * GET /support/tickets?page=1&limit=20&status=OPEN
   */
  @Get('tickets')
  async getTickets(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('assignedToId', new ParseIntPipe({ optional: true })) assignedToId?: number,
    @Query('requesterId', new ParseIntPipe({ optional: true })) requesterId?: number,
    @Query('isEscalated', new ParseIntPipe({ optional: true })) isEscalated?: boolean,
  ): Promise<{ tickets: SupportTicketResponseDto[]; total: number }> {
    return this.supportService.getTickets(page || 1, limit || 20, {
      status,
      priority,
      categoryId,
      organizationId,
      assignedToId,
      requesterId,
      isEscalated,
    });
  }

  /**
   * Get tickets by requester
   * GET /support/tickets/requester/:requesterId
   */
  @Get('tickets/requester/:requesterId')
  async getTicketsByRequester(
    @Param('requesterId', ParseIntPipe) requesterId: number,
  ): Promise<SupportTicketResponseDto[]> {
    return this.supportService.getTicketsByRequester(requesterId);
  }

  /**
   * Get tickets by assignee
   * GET /support/tickets/assignee/:assignedToId
   */
  @Get('tickets/assignee/:assignedToId')
  async getTicketsByAssignee(
    @Param('assignedToId', ParseIntPipe) assignedToId: number,
  ): Promise<SupportTicketResponseDto[]> {
    return this.supportService.getTicketsByAssignee(assignedToId);
  }

  /**
   * Update ticket
   * PUT /support/tickets/:id
   */
  @Put('tickets/:id')
  @Roles('ADMIN', 'HR', 'SUPPORT')
  async updateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSupportTicketDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.updateTicket(id, updateDto, user.userId);
  }

  /**
   * Assign ticket
   * POST /support/tickets/:id/assign
   */
  @Post('tickets/:id/assign')
  @Roles('ADMIN', 'HR', 'SUPPORT')
  @HttpCode(HttpStatus.OK)
  async assignTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignDto: AssignTicketDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.assignTicket(id, assignDto, user.userId);
  }

  /**
   * Update ticket status
   * POST /support/tickets/:id/status
   */
  @Post('tickets/:id/status')
  @Roles('ADMIN', 'HR', 'SUPPORT')
  @HttpCode(HttpStatus.OK)
  async updateTicketStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: UpdateTicketStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.updateTicketStatus(id, statusDto, user.userId);
  }

  /**
   * Add comment to ticket
   * POST /support/tickets/:id/comments
   */
  @Post('tickets/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() commentDto: AddTicketCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.supportService.addComment(id, commentDto, user.userId);
    return { message: 'Comment added successfully' };
  }

  /**
   * Add time entry to ticket
   * POST /support/tickets/:id/time-entries
   */
  @Post('tickets/:id/time-entries')
  @Roles('ADMIN', 'HR', 'SUPPORT')
  @HttpCode(HttpStatus.CREATED)
  async addTimeEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() timeEntryDto: AddTicketTimeEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    // Get employee ID from user - adjust based on your user/employee relationship
    await this.supportService.addTimeEntry(id, timeEntryDto, user.userId);
    return { message: 'Time entry added successfully' };
  }

  /**
   * Get ticket statistics
   * GET /support/tickets/statistics?organizationId=1
   */
  @Get('tickets/statistics')
  @Roles('ADMIN', 'HR', 'SUPPORT')
  async getTicketStatistics(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<{
    total: number;
    open: number;
    closed: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number;
    slaCompliance: number;
  }> {
    return this.supportService.getTicketStatistics(organizationId);
  }

  /**
   * Get SLA compliance metrics
   * GET /support/sla/compliance?organizationId=1
   */
  @Get('sla/compliance')
  @Roles('ADMIN', 'HR', 'SUPPORT')
  async getSLACompliance(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<{
    totalTickets: number;
    firstResponseCompliance: number;
    resolutionCompliance: number;
    averageFirstResponseTime: number;
    averageResolutionTime: number;
    overdueCount: number;
  }> {
    return this.slaTrackingService.getSLAComplianceMetrics(organizationId);
  }

  // ==================== Category Endpoints ====================

  /**
   * Create category
   * POST /support/categories
   */
  @Post('categories')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() createDto: CreateTicketCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketCategoryResponseDto> {
    return this.supportService.createCategory(createDto, user.userId);
  }

  /**
   * Get category by ID
   * GET /support/categories/:id
   */
  @Get('categories/:id')
  async getCategory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TicketCategoryResponseDto> {
    return this.supportService.getCategoryById(id);
  }

  /**
   * Get categories
   * GET /support/categories?organizationId=1
   */
  @Get('categories')
  async getCategories(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<TicketCategoryResponseDto[]> {
    return this.supportService.getCategories(organizationId);
  }

  /**
   * Update category
   * PUT /support/categories/:id
   */
  @Put('categories/:id')
  @Roles('ADMIN', 'HR')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTicketCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketCategoryResponseDto> {
    return this.supportService.updateCategory(id, updateDto, user.userId);
  }

  /**
   * Delete category
   * DELETE /support/categories/:id
   */
  @Delete('categories/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.supportService.deleteCategory(id);
  }

  // ==================== SLA Endpoints ====================

  /**
   * Create SLA
   * POST /support/slas
   */
  @Post('slas')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createSLA(
    @Body() createDto: CreateTicketSLADto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketSLAResponseDto> {
    return this.supportService.createSLA(createDto, user.userId);
  }

  /**
   * Get SLA by ID
   * GET /support/slas/:id
   */
  @Get('slas/:id')
  async getSLA(@Param('id', ParseIntPipe) id: number): Promise<TicketSLAResponseDto> {
    return this.supportService.getSLAById(id);
  }

  /**
   * Get SLAs
   * GET /support/slas?organizationId=1
   */
  @Get('slas')
  async getSLAs(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<TicketSLAResponseDto[]> {
    return this.supportService.getSLAs(organizationId);
  }

  /**
   * Update SLA
   * PUT /support/slas/:id
   */
  @Put('slas/:id')
  @Roles('ADMIN', 'HR')
  async updateSLA(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTicketSLADto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketSLAResponseDto> {
    return this.supportService.updateSLA(id, updateDto, user.userId);
  }

  /**
   * Delete SLA
   * DELETE /support/slas/:id
   */
  @Delete('slas/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSLA(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.supportService.deleteSLA(id);
  }
}
