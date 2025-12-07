import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { LeadService } from './services/lead.service';
import { CreateLeadDto, UpdateLeadDto, LeadResponseDto, ConvertLeadToContactDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { LeadStatus, LeadSource, LeadPriority } from './entities/lead.entity';

/**
 * Leads Controller
 *
 * REST API endpoints for lead management:
 * - Leads (CRUD, search, pipeline tracking)
 * - Lead scoring and routing
 * - Lead conversion to contacts
 * - Campaign attribution
 */
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leadService: LeadService) {}

  /**
   * Create a new lead
   * POST /leads
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'SALES', 'EMPLOYEE')
  async createLead(
    @Body() createDto: CreateLeadDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<LeadResponseDto> {
    return this.leadService.createLead(createDto, user.userId);
  }

  /**
   * Get lead by ID
   * GET /leads/:id
   */
  @Get(':id')
  async getLead(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeConvertedContact', new ParseBoolPipe({ optional: true }))
    includeConvertedContact = false,
  ): Promise<LeadResponseDto> {
    return this.leadService.getLeadById(id, includeConvertedContact);
  }

  /**
   * Get lead by number
   * GET /leads/number/:number
   */
  @Get('number/:number')
  async getLeadByNumber(@Param('number') number: string): Promise<LeadResponseDto> {
    return this.leadService.getLeadByNumber(number);
  }

  /**
   * Update lead
   * PUT /leads/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'SALES', 'EMPLOYEE')
  async updateLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLeadDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<LeadResponseDto> {
    return this.leadService.updateLead(id, updateDto, user.userId);
  }

  /**
   * Search leads
   * GET /leads/search
   */
  @Get('search')
  async searchLeads(
    @Query('q') searchTerm: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.searchLeads(searchTerm, organizationId, includeArchived);
  }

  /**
   * Get leads by status
   * GET /leads/status/:status
   */
  @Get('status/:status')
  async getLeadsByStatus(
    @Param('status') status: LeadStatus,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.getLeadsByStatus(status, organizationId, includeArchived);
  }

  /**
   * Get leads by source
   * GET /leads/source/:source
   */
  @Get('source/:source')
  async getLeadsBySource(
    @Param('source') source: LeadSource,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.getLeadsBySource(source, organizationId, includeArchived);
  }

  /**
   * Get leads by priority
   * GET /leads/priority/:priority
   */
  @Get('priority/:priority')
  async getLeadsByPriority(
    @Param('priority') priority: LeadPriority,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.getLeadsByPriority(priority, organizationId, includeArchived);
  }

  /**
   * Get leads by assigned user
   * GET /leads/assigned/:userId
   */
  @Get('assigned/:userId')
  async getLeadsByAssignedTo(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.getLeadsByAssignedTo(userId, organizationId, includeArchived);
  }

  /**
   * Get leads by campaign
   * GET /leads/campaign/:campaignId
   */
  @Get('campaign/:campaignId')
  async getLeadsByCampaign(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.getLeadsByCampaign(campaignId, organizationId, includeArchived);
  }

  /**
   * Get high-scoring leads
   * GET /leads/high-scoring
   */
  @Get('high-scoring')
  @Roles('ADMIN', 'HR', 'SALES')
  async getHighScoringLeads(
    @Query('minScore', new ParseIntPipe({ optional: true })) minScore = 50,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.getHighScoringLeads(minScore, organizationId, includeArchived);
  }

  /**
   * Get leads needing follow-up
   * GET /leads/follow-up
   */
  @Get('follow-up')
  @Roles('ADMIN', 'HR', 'SALES')
  async getLeadsNeedingFollowUp(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('daysAhead', new ParseIntPipe({ optional: true })) daysAhead = 7,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.getLeadsNeedingFollowUp(organizationId, daysAhead);
  }

  /**
   * Get pipeline statistics
   * GET /leads/statistics
   */
  @Get('statistics')
  @Roles('ADMIN', 'HR', 'SALES')
  async getPipelineStatistics(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byPriority: Record<string, number>;
    averageScore: number;
    convertedCount: number;
    conversionRate: number;
  }> {
    return this.leadService.getPipelineStatistics(organizationId);
  }

  /**
   * Assign lead to user
   * POST /leads/:id/assign
   */
  @Post(':id/assign')
  @Roles('ADMIN', 'HR', 'SALES')
  async assignLead(
    @Param('id', ParseIntPipe) id: number,
    @Body('assignedTo', ParseIntPipe) assignedTo: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<LeadResponseDto> {
    return this.leadService.assignLead(id, assignedTo, user.userId);
  }

  /**
   * Update lead status
   * POST /leads/:id/status
   */
  @Post(':id/status')
  @Roles('ADMIN', 'HR', 'SALES', 'EMPLOYEE')
  async updateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: LeadStatus,
    @CurrentUser() user: JwtPayload,
    @Body('reason') reason?: string,
  ): Promise<LeadResponseDto> {
    return this.leadService.updateLeadStatus(id, status, reason, user.userId);
  }

  /**
   * Recalculate lead score
   * POST /leads/:id/recalculate-score
   */
  @Post(':id/recalculate-score')
  @Roles('ADMIN', 'HR', 'SALES')
  async recalculateLeadScore(@Param('id', ParseIntPipe) id: number): Promise<LeadResponseDto> {
    return this.leadService.recalculateLeadScore(id);
  }

  /**
   * Convert lead to contact
   * POST /leads/:id/convert
   */
  @Post(':id/convert')
  @Roles('ADMIN', 'HR', 'SALES')
  async convertLeadToContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() convertDto: ConvertLeadToContactDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<LeadResponseDto> {
    return this.leadService.convertLeadToContact(id, convertDto, user.userId);
  }

  /**
   * Archive lead
   * POST /leads/:id/archive
   */
  @Post(':id/archive')
  @Roles('ADMIN', 'HR', 'SALES')
  async archiveLead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<LeadResponseDto> {
    return this.leadService.archiveLead(id, user.userId);
  }
}
