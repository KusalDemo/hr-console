import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BusinessRule, RuleType, RuleTriggerType } from '../entities/business-rule.entity';

/**
 * Business Rule Repository
 */
@Injectable()
export class BusinessRuleRepository extends Repository<BusinessRule> {
  constructor(private dataSource: DataSource) {
    super(BusinessRule, dataSource.createEntityManager());
  }

  /**
   * Find rule by key
   */
  async findByKey(ruleKey: string): Promise<BusinessRule | null> {
    return this.findOne({
      where: {
        ruleKey,
        isActive: true,
      },
    });
  }

  /**
   * Find rules by type
   */
  async findByType(ruleType: RuleType): Promise<BusinessRule[]> {
    return this.find({
      where: {
        ruleType,
        isActive: true,
      },
      order: {
        priority: 'ASC',
      },
    });
  }

  /**
   * Find rules by entity type
   */
  async findByEntityType(entityType: string): Promise<BusinessRule[]> {
    return this.find({
      where: {
        entityType,
        isActive: true,
      },
      order: {
        priority: 'ASC',
      },
    });
  }

  /**
   * Find rules by trigger type
   */
  async findByTriggerType(triggerType: RuleTriggerType): Promise<BusinessRule[]> {
    return this.find({
      where: {
        triggerType,
        isActive: true,
      },
      order: {
        priority: 'ASC',
      },
    });
  }

  /**
   * Find active rules (considering activation/expiration dates)
   */
  async findActiveRules(): Promise<BusinessRule[]> {
    const now = new Date();

    const rules = await this.find({
      where: {
        isActive: true,
      },
      order: {
        priority: 'ASC',
      },
    });

    // Filter by activation/expiration dates
    return rules.filter(
      (rule) =>
        (!rule.activationDate || rule.activationDate <= now) &&
        (!rule.expirationDate || rule.expirationDate >= now),
    );
  }

  /**
   * Find applicable rules for entity event
   */
  async findApplicableRules(
    entityType: string,
    triggerEvent: string,
    organizationId?: number,
  ): Promise<BusinessRule[]> {
    const now = new Date();

    const query = this.createQueryBuilder('rule')
      .where('rule.isActive = :isActive', { isActive: true })
      .andWhere('(rule.activationDate IS NULL OR rule.activationDate <= :now)', { now })
      .andWhere('(rule.expirationDate IS NULL OR rule.expirationDate >= :now)', { now })
      .andWhere('rule.triggerType = :triggerType', { triggerType: RuleTriggerType.EVENT })
      .andWhere('(rule.entityType = :entityType OR rule.entityType IS NULL)', { entityType })
      .orderBy('rule.priority', 'ASC');

    if (organizationId) {
      query.andWhere(
        '(rule.organizationId = :organizationId OR rule.organizationId IS NULL OR rule.tenantScope = :allScope)',
        { organizationId, allScope: 'ALL' },
      );
    }

    const rules = await query.getMany();

    // Filter by trigger events
    return rules.filter((rule) => {
      if (!rule.triggerEvents || rule.triggerEvents.length === 0) {
        return true; // No specific events = matches all
      }
      return rule.triggerEvents.includes(triggerEvent);
    });
  }

  /**
   * Check if rule key exists
   */
  async ruleKeyExists(ruleKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('rule').where('rule.ruleKey = :ruleKey', { ruleKey });

    if (excludeId) {
      query.andWhere('rule.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
