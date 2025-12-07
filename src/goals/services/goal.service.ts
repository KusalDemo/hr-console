import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { GoalRepository } from '../repositories/goal.repository';
import { KeyResultRepository } from '../repositories/key-result.repository';
import {
  Goal,
  GoalType,
  GoalStatus,
  GoalPriority,
} from '../entities/goal.entity';
import { KeyResult } from '../entities/key-result.entity';

/**
 * Goal Service
 * 
 * Manages goals with:
 * - Goal CRUD operations
 * - Goal alignment (cascading from org to individual)
 * - Progress tracking
 * - Check-ins
 * - Milestone management
 * - Goal templates and cloning
 */
@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly keyResultRepository: KeyResultRepository,
  ) {}

  /**
   * Create a new goal
   */
  async createGoal(createDto: any, createdBy?: number): Promise<Goal> {
    // Validate period dates
    if (createDto.periodEnd <= createDto.periodStart) {
      throw new BadRequestException('Period end date must be after period start date');
    }

    const goal = this.goalRepository.create({
      ...createDto,
      goalType: createDto.goalType || GoalType.INDIVIDUAL,
      status: createDto.status || GoalStatus.DRAFT,
      priority: createDto.priority || GoalPriority.MEDIUM,
      progressPercentage: 0,
      checkInsCompleted: 0,
      isArchived: false,
      createdBy,
    });

    const saved = await this.goalRepository.save(goal);

    this.logger.log(`Created goal: ${saved.id} (${saved.goalTitle})`);

    return saved;
  }

  /**
   * Get goal by ID
   */
  async getGoalById(
    id: number,
    includeKeyResults = false,
    includeChildren = false,
  ): Promise<Goal> {
    const goal = await this.goalRepository.findById(id, includeKeyResults, includeChildren);

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }

    return goal;
  }

  /**
   * Update goal
   */
  async updateGoal(id: number, updateDto: any, updatedBy?: number): Promise<Goal> {
    const goal = await this.goalRepository.findById(id, true);

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }

    // Validate period dates if being updated
    if (updateDto.periodStart && updateDto.periodEnd) {
      if (updateDto.periodEnd <= updateDto.periodStart) {
        throw new BadRequestException('Period end date must be after period start date');
      }
    }

    Object.assign(goal, {
      ...updateDto,
      updatedBy,
    });

    // Recalculate progress if key results exist
    if (goal.keyResults && Array.isArray(goal.keyResults) && goal.keyResults.length > 0) {
      goal.progressPercentage = await this.calculateGoalProgress(goal.id);
    }

    const saved = await this.goalRepository.save(goal);

    this.logger.log(`Updated goal: ${id}`);

    return saved;
  }

  /**
   * Delete goal (soft delete by archiving)
   */
  async deleteGoal(id: number, updatedBy?: number): Promise<void> {
    const goal = await this.goalRepository.findById(id);

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }

    goal.isArchived = true;
    goal.status = GoalStatus.ARCHIVED;
    goal.updatedBy = updatedBy;

    await this.goalRepository.save(goal);

    this.logger.log(`Archived goal: ${id}`);
  }

  /**
   * Clone goal from template or existing goal
   */
  async cloneGoal(
    sourceGoalId: number,
    newOwnerId: number,
    newPeriodStart: Date,
    newPeriodEnd: Date,
    createdBy?: number,
  ): Promise<Goal> {
    const sourceGoal = await this.goalRepository.findById(sourceGoalId, true);

    if (!sourceGoal) {
      throw new NotFoundException(`Source goal with ID ${sourceGoalId} not found`);
    }

    // Create new goal from source
    const newGoal = this.goalRepository.create({
      goalTitle: sourceGoal.goalTitle,
      goalDescription: sourceGoal.goalDescription,
      goalType: sourceGoal.goalType,
      priority: sourceGoal.priority,
      organizationId: sourceGoal.organizationId,
      ownerId: newOwnerId,
      departmentId: sourceGoal.departmentId,
      teamId: sourceGoal.teamId,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      checkInFrequency: sourceGoal.checkInFrequency,
      milestones: sourceGoal.milestones
        ? sourceGoal.milestones.map((m) => ({
            ...m,
            id: `${Date.now()}-${Math.random()}`,
            completed: false,
            completedDate: undefined,
          }))
        : null,
      metrics: sourceGoal.metrics ? [...sourceGoal.metrics] : null,
      status: GoalStatus.DRAFT,
      progressPercentage: 0,
      checkInsCompleted: 0,
      isArchived: false,
      templateId: sourceGoal.isTemplate ? sourceGoal.id : sourceGoal.templateId,
      createdBy,
    });

    const saved = await this.goalRepository.save(newGoal);

    // Clone key results if they exist
    if (sourceGoal.keyResults && Array.isArray(sourceGoal.keyResults)) {
      const keyResults = sourceGoal.keyResults.map((kr) =>
        this.keyResultRepository.create({
          goalId: saved.id,
          keyResultTitle: kr.keyResultTitle,
          keyResultDescription: kr.keyResultDescription,
          keyResultType: kr.keyResultType,
          ownerId: kr.ownerId,
          targetValue: kr.targetValue,
          currentValue: 0,
          startingValue: kr.startingValue,
          unit: kr.unit,
          progressPercentage: 0,
          status: kr.status,
          createdBy,
        }),
      );

      await this.keyResultRepository.save(keyResults);
    }

    this.logger.log(`Cloned goal: ${sourceGoalId} -> ${saved.id}`);

    return saved;
  }

  /**
   * Align goal to parent (cascade from parent goal)
   */
  async alignGoalToParent(
    goalId: number,
    parentGoalId: number,
    updatedBy?: number,
  ): Promise<Goal> {
    const goal = await this.goalRepository.findById(goalId);
    const parentGoal = await this.goalRepository.findById(parentGoalId);

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    if (!parentGoal) {
      throw new NotFoundException(`Parent goal with ID ${parentGoalId} not found`);
    }

    // Validate alignment (e.g., individual goals can align to team goals, team to org, etc.)
    if (goal.organizationId !== parentGoal.organizationId) {
      throw new BadRequestException('Cannot align goals from different organizations');
    }

    goal.parentGoalId = parentGoalId;
    goal.updatedBy = updatedBy;

    const saved = await this.goalRepository.save(goal);

    this.logger.log(`Aligned goal ${goalId} to parent ${parentGoalId}`);

    return saved;
  }

  /**
   * Get goal alignment chain
   */
  async getGoalAlignmentChain(goalId: number): Promise<Goal[]> {
    return this.goalRepository.findAlignmentChain(goalId);
  }

  /**
   * Get all descendant goals
   */
  async getDescendantGoals(goalId: number): Promise<Goal[]> {
    return this.goalRepository.findAllDescendants(goalId);
  }

  /**
   * Record check-in for goal
   */
  async recordCheckIn(
    goalId: number,
    checkInData: {
      notes?: string;
      progressUpdate?: number;
      milestonesCompleted?: string[];
    },
    updatedBy?: number,
  ): Promise<Goal> {
    const goal = await this.goalRepository.findById(goalId, true);

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    if (goal.status !== GoalStatus.ACTIVE) {
      throw new BadRequestException('Can only record check-ins for active goals');
    }

    // Update progress if provided
    if (checkInData.progressUpdate !== undefined) {
      goal.progressPercentage = Math.min(100, Math.max(0, checkInData.progressUpdate));
    } else {
      // Recalculate from key results
      goal.progressPercentage = await this.calculateGoalProgress(goalId);
    }

    // Update milestones if provided
    if (checkInData.milestonesCompleted && goal.milestones) {
      goal.milestones = goal.milestones.map((milestone) => {
        if (checkInData.milestonesCompleted?.includes(milestone.id)) {
          return {
            ...milestone,
            completed: true,
            completedDate: new Date().toISOString(),
          };
        }
        return milestone;
      });
    }

    // Update check-in dates
    goal.lastCheckInDate = new Date();
    goal.checkInsCompleted = (goal.checkInsCompleted || 0) + 1;

    // Calculate next check-in date based on frequency
    if (goal.checkInFrequency) {
      const nextDate = new Date();
      switch (goal.checkInFrequency.toLowerCase()) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'bi-weekly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        default:
          nextDate.setDate(nextDate.getDate() + 7); // Default to weekly
      }
      goal.nextCheckInDate = nextDate;
    }

    goal.updatedBy = updatedBy;

    const saved = await this.goalRepository.save(goal);

    this.logger.log(`Recorded check-in for goal: ${goalId}`);

    return saved;
  }

  /**
   * Calculate goal progress from key results
   */
  async calculateGoalProgress(goalId: number): Promise<number> {
    const keyResults = await this.keyResultRepository.findByGoal(goalId);

    if (!keyResults || keyResults.length === 0) {
      return 0;
    }

    // Calculate average progress of all key results
    const totalProgress = keyResults.reduce(
      (sum, kr) => sum + (parseFloat(kr.progressPercentage.toString()) || 0),
      0,
    );

    return totalProgress / keyResults.length;
  }

  /**
   * Update goal status
   */
  async updateGoalStatus(
    id: number,
    status: GoalStatus,
    updatedBy?: number,
  ): Promise<Goal> {
    const goal = await this.goalRepository.findById(id);

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }

    // If completing, set completion date and recalculate progress
    if (status === GoalStatus.COMPLETED) {
      goal.actualCompletionDate = new Date();
      goal.progressPercentage = await this.calculateGoalProgress(id);
    }

    goal.status = status;
    goal.updatedBy = updatedBy;

    return this.goalRepository.save(goal);
  }

  /**
   * Get goals by owner
   */
  async getGoalsByOwner(
    ownerId: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Goal[]> {
    return this.goalRepository.findByOwner(ownerId, organizationId, includeArchived);
  }

  /**
   * Get goals by type
   */
  async getGoalsByType(
    type: GoalType,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Goal[]> {
    return this.goalRepository.findByType(type, organizationId, includeArchived);
  }

  /**
   * Get goals in period
   */
  async getGoalsInPeriod(
    startDate: Date,
    endDate: Date,
    organizationId?: number,
    goalType?: GoalType,
  ): Promise<Goal[]> {
    return this.goalRepository.findGoalsInPeriod(startDate, endDate, organizationId, goalType);
  }

  /**
   * Get goals needing check-in
   */
  async getGoalsNeedingCheckIn(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<Goal[]> {
    return this.goalRepository.findGoalsNeedingCheckIn(organizationId, beforeDate);
  }

  /**
   * Get goal templates
   */
  async getGoalTemplates(organizationId?: number): Promise<Goal[]> {
    return this.goalRepository.findTemplates(organizationId);
  }

  /**
   * Search goals
   */
  async searchGoals(filters: {
    searchTerm?: string;
    goalType?: GoalType;
    status?: GoalStatus;
    organizationId?: number;
    ownerId?: number;
    includeArchived?: boolean;
  }): Promise<Goal[]> {
    return this.goalRepository.searchGoals(
      filters.searchTerm,
      filters.goalType,
      filters.status,
      filters.organizationId,
      filters.ownerId,
      filters.includeArchived,
    );
  }
}
