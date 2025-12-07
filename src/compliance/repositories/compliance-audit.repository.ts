import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ComplianceAudit, AuditStatus, AuditType } from '../entities/compliance-audit.entity';

/**
 * Compliance Audit Repository
 */
@Injectable()
export class ComplianceAuditRepository extends Repository<ComplianceAudit> {
  constructor(private dataSource: DataSource) {
    super(ComplianceAudit, dataSource.createEntityManager());
  }

  /**
   * Find audits by framework
   */
  async findByFramework(frameworkId: number): Promise<ComplianceAudit[]> {
    return this.find({
      where: { frameworkId },
      order: { auditStartDate: 'DESC' },
    });
  }

  /**
   * Find by status
   */
  async findByStatus(status: AuditStatus): Promise<ComplianceAudit[]> {
    return this.find({
      where: { auditStatus: status },
      order: { auditStartDate: 'DESC' },
    });
  }

  /**
   * Find by audit type
   */
  async findByType(auditType: AuditType): Promise<ComplianceAudit[]> {
    return this.find({
      where: { auditType },
      order: { auditStartDate: 'DESC' },
    });
  }
}

