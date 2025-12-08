import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  SecurityAuditLog,
  AuditType,
  ActionStatus,
  RiskLevel,
} from '../entities/security-audit-log.entity';

/**
 * Security Audit Log Repository
 */
@Injectable()
export class SecurityAuditLogRepository extends Repository<SecurityAuditLog> {
  constructor(private dataSource: DataSource) {
    super(SecurityAuditLog, dataSource.createEntityManager());
  }

  /**
   * Find logs by user
   */
  async findByUser(userId: number, limit: number = 100): Promise<SecurityAuditLog[]> {
    return this.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find logs by audit type
   */
  async findByAuditType(auditType: AuditType, limit: number = 100): Promise<SecurityAuditLog[]> {
    return this.find({
      where: { auditType },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find logs by risk level
   */
  async findByRiskLevel(riskLevel: RiskLevel, limit: number = 100): Promise<SecurityAuditLog[]> {
    return this.find({
      where: { riskLevel },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find high-risk logs
   */
  async findHighRisk(limit: number = 100): Promise<SecurityAuditLog[]> {
    return this.find({
      where: [{ riskLevel: RiskLevel.HIGH }, { riskLevel: RiskLevel.CRITICAL }],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}


