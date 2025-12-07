import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { KeyResult, KeyResultStatus } from '../entities/key-result.entity';

/**
 * Key Result Repository
 *
 * Custom repository methods for key result queries.
 */
@Injectable()
export class KeyResultRepository extends Repository<KeyResult> {
  constructor(private dataSource: DataSource) {
    super(KeyResult, dataSource.createEntityManager());
  }

  /**
   * Find key result by ID
   */
  async findById(id: number, includeGoal = false): Promise<KeyResult | null> {
    const query = this.createQueryBuilder('keyResult').where('keyResult.id = :id', { id });

    if (includeGoal) {
      query.leftJoinAndSelect('keyResult.goal', 'goal');
    }

    return query.getOne();
  }

  /**
   * Find key results by goal
   */
  async findByGoal(goalId: number): Promise<KeyResult[]> {
    return this.createQueryBuilder('keyResult')
      .where('keyResult.goalId = :goalId', { goalId })
      .orderBy('keyResult.keyResultTitle', 'ASC')
      .getMany();
  }

  /**
   * Find key results by owner
   */
  async findByOwner(ownerId: number, organizationId?: number): Promise<KeyResult[]> {
    const query = this.createQueryBuilder('keyResult')
      .leftJoin('keyResult.goal', 'goal')
      .where('keyResult.ownerId = :ownerId', { ownerId })
      .orderBy('keyResult.keyResultTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find key results by status
   */
  async findByStatus(status: KeyResultStatus, organizationId?: number): Promise<KeyResult[]> {
    const query = this.createQueryBuilder('keyResult')
      .leftJoin('keyResult.goal', 'goal')
      .where('keyResult.status = :status', { status })
      .orderBy('keyResult.keyResultTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find key results at risk
   */
  async findAtRisk(organizationId?: number): Promise<KeyResult[]> {
    const query = this.createQueryBuilder('keyResult')
      .leftJoin('keyResult.goal', 'goal')
      .where('keyResult.status = :status', { status: KeyResultStatus.AT_RISK })
      .andWhere('goal.isArchived = :isArchived', { isArchived: false })
      .orderBy('keyResult.targetCompletionDate', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }
}
