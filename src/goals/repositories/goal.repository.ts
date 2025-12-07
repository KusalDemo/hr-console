import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Goal, GoalType, GoalStatus } from '../entities/goal.entity';

/**
 * Goal Repository
 *
 * Custom repository methods for goal queries with recursive queries for goal alignment.
 */
@Injectable()
export class GoalRepository extends Repository<Goal> {
  constructor(private dataSource: DataSource) {
    super(Goal, dataSource.createEntityManager());
  }

  /**
   * Find goal by ID
   */
  async findById(
    id: number,
    includeKeyResults = false,
    includeChildren = false,
  ): Promise<Goal | null> {
    const query = this.createQueryBuilder('goal').where('goal.id = :id', { id });

    if (includeKeyResults) {
      query.leftJoinAndSelect('goal.keyResults', 'keyResults');
    }

    if (includeChildren) {
      query.leftJoinAndSelect('goal.childGoals', 'childGoals');
    }

    return query.getOne();
  }

  /**
   * Find goals by owner
   */
  async findByOwner(
    ownerId: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Goal[]> {
    const query = this.createQueryBuilder('goal')
      .where('goal.ownerId = :ownerId', { ownerId })
      .orderBy('goal.periodStart', 'DESC')
      .addOrderBy('goal.goalTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('goal.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find goals by type
   */
  async findByType(
    type: GoalType,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Goal[]> {
    const query = this.createQueryBuilder('goal')
      .where('goal.goalType = :type', { type })
      .orderBy('goal.periodStart', 'DESC')
      .addOrderBy('goal.goalTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('goal.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find goals by status
   */
  async findByStatus(status: GoalStatus, organizationId?: number): Promise<Goal[]> {
    const query = this.createQueryBuilder('goal')
      .where('goal.status = :status', { status })
      .andWhere('goal.isArchived = :isArchived', { isArchived: false })
      .orderBy('goal.periodStart', 'DESC')
      .addOrderBy('goal.goalTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find child goals (recursive query for goal alignment)
   */
  async findChildGoals(parentGoalId: number, includeArchived = false): Promise<Goal[]> {
    const query = this.createQueryBuilder('goal')
      .where('goal.parentGoalId = :parentGoalId', { parentGoalId })
      .orderBy('goal.goalTitle', 'ASC');

    if (!includeArchived) {
      query.andWhere('goal.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find all descendant goals (recursive query)
   */
  async findAllDescendants(goalId: number): Promise<Goal[]> {
    // Using recursive CTE for PostgreSQL
    const result = await this.query(
      `
      WITH RECURSIVE goal_tree AS (
        SELECT id, parent_goal_id, goal_title, goal_type, status, organization_id
        FROM goals
        WHERE id = $1
        
        UNION ALL
        
        SELECT g.id, g.parent_goal_id, g.goal_title, g.goal_type, g.status, g.organization_id
        FROM goals g
        INNER JOIN goal_tree gt ON g.parent_goal_id = gt.id
        WHERE g.is_archived = false
      )
      SELECT * FROM goal_tree WHERE id != $1
      ORDER BY goal_title
    `,
      [goalId],
    );

    return result;
  }

  /**
   * Find goal alignment chain (from root to goal)
   */
  async findAlignmentChain(goalId: number): Promise<Goal[]> {
    // Using recursive CTE to find all ancestors
    const result = await this.query(
      `
      WITH RECURSIVE goal_chain AS (
        SELECT id, parent_goal_id, goal_title, goal_type, status, organization_id, 0 as level
        FROM goals
        WHERE id = $1
        
        UNION ALL
        
        SELECT g.id, g.parent_goal_id, g.goal_title, g.goal_type, g.status, g.organization_id, gc.level + 1
        FROM goals g
        INNER JOIN goal_chain gc ON g.id = gc.parent_goal_id
      )
      SELECT * FROM goal_chain
      ORDER BY level DESC
    `,
      [goalId],
    );

    return result;
  }

  /**
   * Find goals in period
   */
  async findGoalsInPeriod(
    startDate: Date,
    endDate: Date,
    organizationId?: number,
    goalType?: GoalType,
  ): Promise<Goal[]> {
    const query = this.createQueryBuilder('goal')
      .where('goal.periodStart <= :endDate', { endDate })
      .andWhere('goal.periodEnd >= :startDate', { startDate })
      .andWhere('goal.isArchived = :isArchived', { isArchived: false })
      .orderBy('goal.periodStart', 'ASC')
      .addOrderBy('goal.goalTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    if (goalType) {
      query.andWhere('goal.goalType = :goalType', { goalType });
    }

    return query.getMany();
  }

  /**
   * Find goals needing check-in
   */
  async findGoalsNeedingCheckIn(organizationId?: number, beforeDate?: Date): Promise<Goal[]> {
    const checkInDate = beforeDate || new Date();
    const query = this.createQueryBuilder('goal')
      .where('goal.status = :status', { status: GoalStatus.ACTIVE })
      .andWhere('goal.isArchived = :isArchived', { isArchived: false })
      .andWhere('(goal.nextCheckInDate IS NULL OR goal.nextCheckInDate <= :checkInDate)', {
        checkInDate,
      })
      .orderBy('goal.nextCheckInDate', 'ASC')
      .addOrderBy('goal.goalTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find goal templates
   */
  async findTemplates(organizationId?: number): Promise<Goal[]> {
    const query = this.createQueryBuilder('goal')
      .where('goal.isTemplate = :isTemplate', { isTemplate: true })
      .orderBy('goal.goalTitle', 'ASC');

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Search goals
   */
  async searchGoals(
    searchTerm?: string,
    goalType?: GoalType,
    status?: GoalStatus,
    organizationId?: number,
    ownerId?: number,
    includeArchived = false,
  ): Promise<Goal[]> {
    const query = this.createQueryBuilder('goal')
      .orderBy('goal.periodStart', 'DESC')
      .addOrderBy('goal.goalTitle', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          goal.goalTitle ILIKE :searchTerm OR
          goal.goalDescription ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (goalType) {
      query.andWhere('goal.goalType = :goalType', { goalType });
    }

    if (status) {
      query.andWhere('goal.status = :status', { status });
    }

    if (organizationId) {
      query.andWhere('goal.organizationId = :organizationId', { organizationId });
    }

    if (ownerId) {
      query.andWhere('goal.ownerId = :ownerId', { ownerId });
    }

    if (!includeArchived) {
      query.andWhere('goal.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }
}
