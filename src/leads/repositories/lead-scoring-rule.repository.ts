import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LeadScoringRule, ScoringRuleType } from '../entities/lead-scoring-rule.entity';

/**
 * Lead Scoring Rule Repository
 *
 * Custom repository methods for lead scoring rule queries.
 */
@Injectable()
export class LeadScoringRuleRepository extends Repository<LeadScoringRule> {
  constructor(private dataSource: DataSource) {
    super(LeadScoringRule, dataSource.createEntityManager());
  }

  /**
   * Find active scoring rules
   */
  async findActive(organizationId?: number): Promise<LeadScoringRule[]> {
    const query = this.createQueryBuilder('rule')
      .where('rule.isActive = :isActive', { isActive: true })
      .andWhere('(rule.activationDate IS NULL OR rule.activationDate <= :now)', { now: new Date() })
      .andWhere('(rule.expirationDate IS NULL OR rule.expirationDate >= :now)', { now: new Date() })
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.createdAt', 'ASC');

    if (organizationId) {
      query.andWhere('(rule.organizationId IS NULL OR rule.organizationId = :organizationId)', {
        organizationId,
      });
    }

    return query.getMany();
  }

  /**
   * Find scoring rules by type
   */
  async findByType(
    ruleType: ScoringRuleType,
    organizationId?: number,
    includeInactive = false,
  ): Promise<LeadScoringRule[]> {
    const query = this.createQueryBuilder('rule')
      .where('rule.ruleType = :ruleType', { ruleType })
      .orderBy('rule.priority', 'DESC');

    if (organizationId) {
      query.andWhere('(rule.organizationId IS NULL OR rule.organizationId = :organizationId)', {
        organizationId,
      });
    }

    if (!includeInactive) {
      query.andWhere('rule.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find scoring rules by organization
   */
  async findByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<LeadScoringRule[]> {
    const query = this.createQueryBuilder('rule')
      .where('(rule.organizationId IS NULL OR rule.organizationId = :organizationId)', {
        organizationId,
      })
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.createdAt', 'ASC');

    if (!includeInactive) {
      query.andWhere('rule.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }
}
