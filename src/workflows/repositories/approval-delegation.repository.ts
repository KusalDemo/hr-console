import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApprovalDelegation } from '../entities/approval-delegation.entity';

/**
 * Approval Delegation Repository
 * 
 * Custom repository methods for approval delegation queries.
 */
@Injectable()
export class ApprovalDelegationRepository extends Repository<ApprovalDelegation> {
  constructor(private dataSource: DataSource) {
    super(ApprovalDelegation, dataSource.createEntityManager());
  }

  /**
   * Find delegation by ID
   */
  async findById(id: number): Promise<ApprovalDelegation | null> {
    return this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.delegator', 'delegator')
      .leftJoinAndSelect('delegation.delegate', 'delegate')
      .where('delegation.id = :id', { id })
      .getOne();
  }

  /**
   * Find active delegations for a delegator
   */
  async findActiveDelegations(
    delegatorId: number,
    workflowKey?: string,
    entityType?: string,
  ): Promise<ApprovalDelegation[]> {
    const now = new Date();
    const query = this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.delegate', 'delegate')
      .where('delegation.delegatorId = :delegatorId', { delegatorId })
      .andWhere('delegation.isActive = :isActive', { isActive: true })
      .andWhere('delegation.effectiveStartDate <= :now', { now })
      .andWhere(
        '(delegation.effectiveEndDate IS NULL OR delegation.effectiveEndDate >= :now)',
        { now },
      )
      .orderBy('delegation.effectiveStartDate', 'DESC');

    if (workflowKey) {
      query.andWhere(
        '(delegation.workflowKey IS NULL OR delegation.workflowKey = :workflowKey)',
        { workflowKey },
      );
    }

    if (entityType) {
      query.andWhere(
        '(delegation.entityType IS NULL OR delegation.entityType = :entityType)',
        { entityType },
      );
    }

    return query.getMany();
  }

  /**
   * Find delegations where employee is a delegate
   */
  async findDelegationsForDelegate(delegateId: number): Promise<ApprovalDelegation[]> {
    const now = new Date();
    return this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.delegator', 'delegator')
      .where('delegation.delegateId = :delegateId', { delegateId })
      .andWhere('delegation.isActive = :isActive', { isActive: true })
      .andWhere('delegation.effectiveStartDate <= :now', { now })
      .andWhere(
        '(delegation.effectiveEndDate IS NULL OR delegation.effectiveEndDate >= :now)',
        { now },
      )
      .orderBy('delegation.effectiveStartDate', 'DESC')
      .getMany();
  }

  /**
   * Find automatic delegations
   */
  async findAutomaticDelegations(delegatorId: number): Promise<ApprovalDelegation[]> {
    const now = new Date();
    return this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.delegate', 'delegate')
      .where('delegation.delegatorId = :delegatorId', { delegatorId })
      .andWhere('delegation.isAutomatic = :isAutomatic', { isAutomatic: true })
      .andWhere('delegation.isActive = :isActive', { isActive: true })
      .andWhere('delegation.effectiveStartDate <= :now', { now })
      .andWhere(
        '(delegation.effectiveEndDate IS NULL OR delegation.effectiveEndDate >= :now)',
        { now },
      )
      .getMany();
  }
}
