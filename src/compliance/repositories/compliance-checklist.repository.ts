import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ComplianceChecklist, ChecklistStatus } from '../entities/compliance-checklist.entity';

/**
 * Compliance Checklist Repository
 */
@Injectable()
export class ComplianceChecklistRepository extends Repository<ComplianceChecklist> {
  constructor(private dataSource: DataSource) {
    super(ComplianceChecklist, dataSource.createEntityManager());
  }

  /**
   * Find checklists by framework
   */
  async findByFramework(frameworkId: number): Promise<ComplianceChecklist[]> {
    return this.find({
      where: { frameworkId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find by status
   */
  async findByStatus(status: ChecklistStatus): Promise<ComplianceChecklist[]> {
    return this.find({
      where: { checklistStatus: status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find active checklists
   */
  async findActive(): Promise<ComplianceChecklist[]> {
    return this.find({
      where: { checklistStatus: ChecklistStatus.IN_PROGRESS },
      order: { targetCompletionDate: 'ASC' },
    });
  }
}

