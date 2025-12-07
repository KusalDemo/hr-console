import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceFramework, FrameworkType } from '../entities/compliance-framework.entity';
import { ComplianceFrameworkRepository } from '../repositories/compliance-framework.repository';
import { ComplianceChecklistRepository } from '../repositories/compliance-checklist.repository';
import { ComplianceAuditRepository } from '../repositories/compliance-audit.repository';
import { ComplianceEvidenceRepository } from '../repositories/compliance-evidence.repository';
import {
  ComplianceRequirement,
  RequirementType,
  Priority,
} from '../entities/compliance-requirement.entity';
import {
  ComplianceChecklist,
  ChecklistType,
  ChecklistStatus,
} from '../entities/compliance-checklist.entity';
import { ComplianceChecklistItem, ItemStatus } from '../entities/compliance-checklist-item.entity';
import { ComplianceAudit, AuditType, AuditStatus } from '../entities/compliance-audit.entity';
import {
  ComplianceAuditFinding,
  FindingType,
  Severity,
  FindingStatus,
  RemediationStatus,
} from '../entities/compliance-audit-finding.entity';
import { ComplianceEvidence, EvidenceType } from '../entities/compliance-evidence.entity';
import {
  ComplianceAutomatedCheck,
  CheckType,
  ExecutionFrequency,
  CheckResult,
} from '../entities/compliance-automated-check.entity';
import * as crypto from 'crypto';

/**
 * Compliance Service
 *
 * Handles compliance tracking and reporting:
 * - Framework management
 * - Checklist creation and management
 * - Audit execution
 * - Evidence collection
 * - Automated compliance checks
 */
@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    public readonly frameworkRepository: ComplianceFrameworkRepository,
    @InjectRepository(ComplianceRequirement)
    private requirementRepository: Repository<ComplianceRequirement>,
    public readonly checklistRepository: ComplianceChecklistRepository,
    @InjectRepository(ComplianceChecklistItem)
    private checklistItemRepository: Repository<ComplianceChecklistItem>,
    public readonly auditRepository: ComplianceAuditRepository,
    @InjectRepository(ComplianceAuditFinding)
    private findingRepository: Repository<ComplianceAuditFinding>,
    public readonly evidenceRepository: ComplianceEvidenceRepository,
    @InjectRepository(ComplianceAutomatedCheck)
    private automatedCheckRepository: Repository<ComplianceAutomatedCheck>,
  ) {}

  /**
   * Enable framework for tenant
   */
  async enableFramework(frameworkId: number): Promise<void> {
    const framework = await this.frameworkRepository.findOne({
      where: { id: frameworkId },
    });

    if (!framework) {
      throw new NotFoundException('Compliance framework not found');
    }

    framework.isEnabled = true;
    await this.frameworkRepository.save(framework);
  }

  /**
   * Create compliance checklist from framework
   */
  async createChecklist(
    frameworkId: number,
    checklistName: string,
    checklistType: ChecklistType,
    organizationId?: number,
    assignedToId?: number,
  ): Promise<ComplianceChecklist> {
    const framework = await this.frameworkRepository.findOne({
      where: { id: frameworkId },
    });

    if (!framework) {
      throw new NotFoundException('Compliance framework not found');
    }

    // Get all active requirements for framework
    const requirements = await this.requirementRepository.find({
      where: { frameworkId, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    const checklistKey = this.generateChecklistKey();
    const checklist = this.checklistRepository.create({
      checklistKey,
      frameworkId,
      checklistName,
      checklistType,
      checklistStatus: ChecklistStatus.DRAFT,
      organizationId: organizationId || null,
      isTenantWide: !organizationId,
      totalRequirements: requirements.length,
      notStartedRequirements: requirements.length,
      assignedToId: assignedToId || null,
    });

    const savedChecklist = await this.checklistRepository.save(checklist);

    // Create checklist items for each requirement
    const items = requirements.map((req) =>
      this.checklistItemRepository.create({
        checklistId: savedChecklist.id,
        requirementId: req.id,
        itemStatus: ItemStatus.NOT_STARTED,
        completionPercentage: 0,
      }),
    );

    await this.checklistItemRepository.save(items);

    return savedChecklist;
  }

  /**
   * Update checklist item status
   */
  async updateChecklistItem(
    itemId: number,
    status: ItemStatus,
    completionPercentage?: number,
    notes?: string,
  ): Promise<void> {
    const item = await this.checklistItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    item.itemStatus = status;
    item.completionPercentage = completionPercentage ?? item.completionPercentage;
    item.notes = notes || item.notes;

    if (status === ItemStatus.IN_PROGRESS && !item.startedAt) {
      item.startedAt = new Date();
    }

    if (status === ItemStatus.COMPLETED && !item.completedAt) {
      item.completedAt = new Date();
    }

    await this.checklistItemRepository.save(item);

    // Update checklist statistics
    await this.updateChecklistStatistics(item.checklistId);
  }

  /**
   * Create compliance audit
   */
  async createAudit(
    frameworkId: number,
    auditName: string,
    auditType: AuditType,
    auditStartDate: Date,
    checklistId?: number,
    auditLeadId?: number,
  ): Promise<ComplianceAudit> {
    const auditKey = this.generateAuditKey();
    const audit = this.auditRepository.create({
      auditKey,
      frameworkId,
      checklistId: checklistId || null,
      auditName,
      auditType,
      auditStartDate,
      auditStatus: AuditStatus.PLANNED,
    });

    if (auditLeadId) {
      audit.auditLeadId = auditLeadId;
    }

    return this.auditRepository.save(audit);
  }

  /**
   * Add audit finding
   */
  async addAuditFinding(
    auditId: number,
    findingType: FindingType,
    severity: Severity,
    findingTitle: string,
    findingDescription: string,
    requirementId?: number,
    checklistItemId?: number,
  ): Promise<ComplianceAuditFinding> {
    const finding = this.findingRepository.create({
      auditId,
      requirementId: requirementId || null,
      checklistItemId: checklistItemId || null,
      findingType,
      severity,
      findingTitle,
      findingDescription,
      findingStatus: FindingStatus.OPEN,
      remediationStatus: RemediationStatus.PENDING,
    });

    const savedFinding = await this.findingRepository.save(finding);

    // Update audit findings count
    await this.updateAuditFindingsCount(auditId);

    return savedFinding;
  }

  /**
   * Add evidence to requirement
   */
  async addEvidence(
    requirementId: number,
    evidenceType: EvidenceType,
    evidenceName: string,
    filePath?: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string,
    checklistItemId?: number,
    auditId?: number,
    collectedById?: number,
  ): Promise<ComplianceEvidence> {
    const evidenceKey = this.generateEvidenceKey();
    const evidence = this.evidenceRepository.create({
      evidenceKey,
      requirementId,
      checklistItemId: checklistItemId || null,
      auditId: auditId || null,
      evidenceType,
      evidenceName,
      filePath: filePath || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      fileType: fileType || null,
      collectedById: collectedById || null,
    });

    const savedEvidence = await this.evidenceRepository.save(evidence);

    // Update checklist item evidence count
    if (checklistItemId) {
      await this.updateChecklistItemEvidenceCount(checklistItemId);
    }

    return savedEvidence;
  }

  /**
   * Create automated compliance check
   */
  async createAutomatedCheck(
    requirementId: number,
    checkName: string,
    checkType: CheckType,
    checkScript: string,
    executionFrequency: ExecutionFrequency = ExecutionFrequency.DAILY,
    checkConfiguration?: Record<string, any>,
  ): Promise<ComplianceAutomatedCheck> {
    const checkKey = this.generateCheckKey();
    const check = this.automatedCheckRepository.create({
      checkKey,
      requirementId,
      checkName,
      checkType,
      checkScript,
      executionFrequency,
      checkConfiguration: checkConfiguration || null,
      isActive: true,
      isEnabled: true,
    });

    // Calculate next execution time
    check.nextExecutionAt = this.calculateNextExecutionTime(executionFrequency);

    return this.automatedCheckRepository.save(check);
  }

  /**
   * Get compliance status for framework
   */
  async getFrameworkComplianceStatus(frameworkId: number): Promise<{
    framework: ComplianceFramework;
    totalRequirements: number;
    compliantRequirements: number;
    nonCompliantRequirements: number;
    partiallyCompliant: number;
    compliancePercentage: number;
  }> {
    const framework = await this.frameworkRepository.findOne({
      where: { id: frameworkId },
    });

    if (!framework) {
      throw new NotFoundException('Compliance framework not found');
    }

    const requirements = await this.requirementRepository.find({
      where: { frameworkId, isActive: true },
    });

    // Get active checklists for framework
    const checklists = await this.checklistRepository.find({
      where: { frameworkId, checklistStatus: ChecklistStatus.IN_PROGRESS },
    });

    let compliantCount = 0;
    let nonCompliantCount = 0;
    let partiallyCompliantCount = 0;

    for (const checklist of checklists) {
      const items = await this.checklistItemRepository.find({
        where: { checklistId: checklist.id },
      });

      for (const item of items) {
        if (item.itemStatus === ItemStatus.COMPLETED) {
          compliantCount++;
        } else if (item.itemStatus === ItemStatus.FAILED) {
          nonCompliantCount++;
        } else if (item.itemStatus === ItemStatus.IN_PROGRESS) {
          partiallyCompliantCount++;
        }
      }
    }

    const total = requirements.length;
    const compliancePercentage = total > 0 ? (compliantCount / total) * 100 : 0;

    return {
      framework,
      totalRequirements: total,
      compliantRequirements: compliantCount,
      nonCompliantRequirements: nonCompliantCount,
      partiallyCompliant: partiallyCompliantCount,
      compliancePercentage,
    };
  }

  // Private helper methods

  private generateChecklistKey(): string {
    return `CHECKLIST-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateAuditKey(): string {
    return `AUDIT-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateEvidenceKey(): string {
    return `EVIDENCE-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateCheckKey(): string {
    return `CHECK-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private async updateChecklistStatistics(checklistId: number): Promise<void> {
    const items = await this.checklistItemRepository.find({
      where: { checklistId },
    });

    const checklist = await this.checklistRepository.findOne({
      where: { id: checklistId },
    });

    if (!checklist) {
      return;
    }

    const total = items.length;
    const completed = items.filter((i) => i.itemStatus === ItemStatus.COMPLETED).length;
    const inProgress = items.filter((i) => i.itemStatus === ItemStatus.IN_PROGRESS).length;
    const notStarted = items.filter((i) => i.itemStatus === ItemStatus.NOT_STARTED).length;

    checklist.totalRequirements = total;
    checklist.completedRequirements = completed;
    checklist.inProgressRequirements = inProgress;
    checklist.notStartedRequirements = notStarted;
    checklist.completionPercentage = total > 0 ? (completed / total) * 100 : 0;

    if (completed === total && total > 0) {
      checklist.checklistStatus = ChecklistStatus.COMPLETED;
      checklist.completedAt = new Date();
    } else if (inProgress > 0 || completed > 0) {
      checklist.checklistStatus = ChecklistStatus.IN_PROGRESS;
    }

    await this.checklistRepository.save(checklist);
  }

  private async updateAuditFindingsCount(auditId: number): Promise<void> {
    const findings = await this.findingRepository.find({
      where: { auditId },
    });

    const audit = await this.auditRepository.findOne({
      where: { id: auditId },
    });

    if (!audit) {
      return;
    }

    audit.findingsCount = findings.length;
    audit.criticalFindings = findings.filter((f) => f.severity === Severity.CRITICAL).length;
    audit.highFindings = findings.filter((f) => f.severity === Severity.HIGH).length;
    audit.mediumFindings = findings.filter((f) => f.severity === Severity.MEDIUM).length;
    audit.lowFindings = findings.filter((f) => f.severity === Severity.LOW).length;

    await this.auditRepository.save(audit);
  }

  private async updateChecklistItemEvidenceCount(checklistItemId: number): Promise<void> {
    const count = await this.evidenceRepository.count({
      where: { checklistItemId, isActive: true },
    });

    const item = await this.checklistItemRepository.findOne({
      where: { id: checklistItemId },
    });

    if (item) {
      item.evidenceCount = count;
      if (count > 0) {
        item.lastEvidenceDate = new Date();
      }
      await this.checklistItemRepository.save(item);
    }
  }

  private calculateNextExecutionTime(frequency: ExecutionFrequency): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case ExecutionFrequency.HOURLY:
        next.setHours(next.getHours() + 1);
        break;
      case ExecutionFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case ExecutionFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case ExecutionFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return now;
    }

    return next;
  }
}
