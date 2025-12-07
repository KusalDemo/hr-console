import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComplianceService } from './services/compliance.service';
import { CreateChecklistDto, CreateAuditDto, AddFindingDto } from './dto';
import { ChecklistStatus, ItemStatus } from './entities/compliance-checklist.entity';
import { EvidenceType } from './entities/compliance-evidence.entity';

/**
 * Compliance Controller
 * 
 * Provides endpoints for compliance management:
 * - Framework management
 * - Checklist creation and tracking
 * - Audit execution
 * - Evidence collection
 * - Compliance reporting
 */
@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // ========== Framework Endpoints ==========

  /**
   * Get enabled frameworks
   */
  @Get('frameworks')
  async getFrameworks(@Query('enabled') enabled?: boolean) {
    if (enabled) {
      return this.complianceService['frameworkRepository'].findEnabled();
    }
    return this.complianceService['frameworkRepository'].find({
      where: { isActive: true },
      order: { frameworkName: 'ASC' },
    });
  }

  /**
   * Get framework by code
   */
  @Get('frameworks/:code')
  async getFrameworkByCode(@Param('code') code: string) {
    return this.complianceService['frameworkRepository'].findByCode(code);
  }

  /**
   * Enable framework
   */
  @Put('frameworks/:id/enable')
  async enableFramework(@Param('id') id: number) {
    await this.complianceService.enableFramework(id);
    return { message: 'Framework enabled successfully' };
  }

  // ========== Checklist Endpoints ==========

  /**
   * Create compliance checklist
   */
  @Post('checklists')
  async createChecklist(
    @Request() req: any,
    @Body() dto: CreateChecklistDto,
  ) {
    const checklist = await this.complianceService.createChecklist(
      dto.frameworkId,
      dto.checklistName,
      dto.checklistType,
      dto.organizationId,
      dto.assignedToId || req.user.id,
    );

    return {
      id: checklist.id,
      checklistKey: checklist.checklistKey,
      checklistName: checklist.checklistName,
      checklistStatus: checklist.checklistStatus,
      totalRequirements: checklist.totalRequirements,
    };
  }

  /**
   * Get checklists
   */
  @Get('checklists')
  async getChecklists(
    @Query('frameworkId') frameworkId?: number,
    @Query('status') status?: ChecklistStatus,
  ) {
    if (frameworkId) {
      return this.complianceService['checklistRepository'].findByFramework(
        parseInt(frameworkId.toString(), 10),
      );
    }
    if (status) {
      return this.complianceService['checklistRepository'].findByStatus(status);
    }
    return this.complianceService['checklistRepository'].findActive();
  }

  /**
   * Get checklist by ID
   */
  @Get('checklists/:id')
  async getChecklist(@Param('id') id: number) {
    return this.complianceService['checklistRepository'].findOne({
      where: { id },
      relations: ['framework'],
    });
  }

  /**
   * Update checklist item
   */
  @Put('checklist-items/:id')
  async updateChecklistItem(
    @Param('id') id: number,
    @Body() dto: { status: ItemStatus; completionPercentage?: number; notes?: string },
  ) {
    await this.complianceService.updateChecklistItem(
      id,
      dto.status,
      dto.completionPercentage,
      dto.notes,
    );
    return { message: 'Checklist item updated successfully' };
  }

  // ========== Audit Endpoints ==========

  /**
   * Create compliance audit
   */
  @Post('audits')
  async createAudit(@Request() req: any, @Body() dto: CreateAuditDto) {
    const audit = await this.complianceService.createAudit(
      dto.frameworkId,
      dto.auditName,
      dto.auditType,
      new Date(dto.auditStartDate),
      dto.checklistId,
      dto.auditLeadId || req.user.id,
    );

    return {
      id: audit.id,
      auditKey: audit.auditKey,
      auditName: audit.auditName,
      auditStatus: audit.auditStatus,
    };
  }

  /**
   * Get audits
   */
  @Get('audits')
  async getAudits(
    @Query('frameworkId') frameworkId?: number,
    @Query('status') status?: string,
  ) {
    if (frameworkId) {
      return this.complianceService['auditRepository'].findByFramework(
        parseInt(frameworkId.toString(), 10),
      );
    }
    if (status) {
      return this.complianceService['auditRepository'].findByStatus(
        status as any,
      );
    }
    return this.complianceService['auditRepository'].find({
      order: { auditStartDate: 'DESC' },
    });
  }

  /**
   * Add audit finding
   */
  @Post('audits/:auditId/findings')
  async addFinding(
    @Param('auditId') auditId: number,
    @Body() dto: AddFindingDto,
  ) {
    const finding = await this.complianceService.addAuditFinding(
      auditId,
      dto.findingType,
      dto.severity,
      dto.findingTitle,
      dto.findingDescription,
      dto.requirementId,
      dto.checklistItemId,
    );

    return {
      id: finding.id,
      findingTitle: finding.findingTitle,
      severity: finding.severity,
      findingStatus: finding.findingStatus,
    };
  }

  // ========== Evidence Endpoints ==========

  /**
   * Add evidence
   */
  @Post('evidence')
  async addEvidence(
    @Request() req: any,
    @Body()
    dto: {
      requirementId: number;
      evidenceType: EvidenceType;
      evidenceName: string;
      filePath?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      checklistItemId?: number;
      auditId?: number;
    },
  ) {
    const evidence = await this.complianceService.addEvidence(
      dto.requirementId,
      dto.evidenceType,
      dto.evidenceName,
      dto.filePath,
      dto.fileName,
      dto.fileSize,
      dto.fileType,
      dto.checklistItemId,
      dto.auditId,
      req.user.id,
    );

    return {
      id: evidence.id,
      evidenceKey: evidence.evidenceKey,
      evidenceName: evidence.evidenceName,
      evidenceType: evidence.evidenceType,
    };
  }

  /**
   * Get evidence
   */
  @Get('evidence')
  async getEvidence(
    @Query('requirementId') requirementId?: number,
    @Query('checklistItemId') checklistItemId?: number,
  ) {
    if (requirementId) {
      return this.complianceService['evidenceRepository'].findByRequirement(
        parseInt(requirementId.toString(), 10),
      );
    }
    if (checklistItemId) {
      return this.complianceService['evidenceRepository'].findByChecklistItem(
        parseInt(checklistItemId.toString(), 10),
      );
    }
    return this.complianceService['evidenceRepository'].find({
      where: { isActive: true },
      order: { collectedAt: 'DESC' },
    });
  }

  // ========== Reporting Endpoints ==========

  /**
   * Get compliance status
   */
  @Get('status/:frameworkId')
  async getComplianceStatus(@Param('frameworkId') frameworkId: number) {
    return this.complianceService.getFrameworkComplianceStatus(frameworkId);
  }
}
