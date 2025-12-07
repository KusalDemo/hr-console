import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LeavePolicy } from '../entities/leave-policy.entity';

/**
 * Leave Policy Repository
 * 
 * Custom repository methods for leave policy queries.
 */
@Injectable()
export class LeavePolicyRepository extends Repository<LeavePolicy> {
  constructor(private dataSource: DataSource) {
    super(LeavePolicy, dataSource.createEntityManager());
  }

  /**
   * Find policy by ID
   */
  async findById(id: number): Promise<LeavePolicy | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * Find policy by key
   */
  async findByPolicyKey(policyKey: string): Promise<LeavePolicy | null> {
    return this.findOne({ where: { policyKey } });
  }

  /**
   * Find active policies
   */
  async findActive(organizationId?: number): Promise<LeavePolicy[]> {
    const query = this.createQueryBuilder('policy')
      .where('policy.active = :active', { active: true })
      .andWhere('policy.effectiveStartDate <= :now', { now: new Date() })
      .andWhere(
        '(policy.effectiveEndDate IS NULL OR policy.effectiveEndDate >= :now)',
        { now: new Date() },
      )
      .orderBy('policy.policyName', 'ASC');

    // Note: organizationId filtering would require organization relationship
    // For now, we'll skip it as policies are tenant-level

    return query.getMany();
  }

  /**
   * Find template policies
   */
  async findTemplates(category?: string): Promise<LeavePolicy[]> {
    const query = this.createQueryBuilder('policy')
      .where('policy.isTemplate = :isTemplate', { isTemplate: true })
      .orderBy('policy.policyName', 'ASC');

    if (category) {
      query.andWhere('policy.templateCategory = :category', { category });
    }

    return query.getMany();
  }

  /**
   * Search policies
   */
  async searchPolicies(
    searchTerm?: string,
    isTemplate?: boolean,
    isActive?: boolean,
    category?: string,
  ): Promise<LeavePolicy[]> {
    const query = this.createQueryBuilder('policy').orderBy('policy.policyName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          policy.policyName ILIKE :searchTerm OR
          policy.description ILIKE :searchTerm OR
          policy.policyKey ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (isTemplate !== undefined) {
      query.andWhere('policy.isTemplate = :isTemplate', { isTemplate });
    }

    if (isActive !== undefined) {
      query.andWhere('policy.active = :isActive', { isActive });
    }

    if (category) {
      query.andWhere('policy.templateCategory = :category', { category });
    }

    return query.getMany();
  }
}
