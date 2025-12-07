import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { KeyResultRepository } from '../repositories/key-result.repository';
import { GoalRepository } from '../repositories/goal.repository';
import { GoalService } from './goal.service';
import { KeyResult, KeyResultStatus, KeyResultType } from '../entities/key-result.entity';

/**
 * Key Result Service
 *
 * Manages key results with:
 * - Key result CRUD operations
 * - Progress tracking
 * - Check-in history
 * - Status updates
 */
@Injectable()
export class KeyResultService {
  private readonly logger = new Logger(KeyResultService.name);

  constructor(
    private readonly keyResultRepository: KeyResultRepository,
    private readonly goalRepository: GoalRepository,
    private readonly goalService: GoalService,
  ) {}

  /**
   * Create a new key result
   */
  async createKeyResult(createDto: any, createdBy?: number): Promise<KeyResult> {
    // Validate goal exists
    const goal = await this.goalRepository.findById(createDto.goalId);

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${createDto.goalId} not found`);
    }

    // Validate target value
    if (createDto.targetValue <= createDto.startingValue) {
      throw new BadRequestException('Target value must be greater than starting value');
    }

    const keyResult = this.keyResultRepository.create({
      ...createDto,
      keyResultType: createDto.keyResultType || KeyResultType.PERCENTAGE,
      status: createDto.status || KeyResultStatus.NOT_STARTED,
      currentValue: createDto.currentValue || createDto.startingValue || 0,
      startingValue: createDto.startingValue || 0,
      progressPercentage: 0,
      createdBy,
    });

    const saved = await this.keyResultRepository.save(keyResult);

    // Update goal progress
    await this.goalService.calculateGoalProgress(createDto.goalId);

    const savedEntity = Array.isArray(saved) ? saved[0] : saved;
    this.logger.log(`Created key result: ${savedEntity.id} for goal ${createDto.goalId}`);

    return savedEntity;
  }

  /**
   * Get key result by ID
   */
  async getKeyResultById(id: number, includeGoal = false): Promise<KeyResult> {
    const keyResult = await this.keyResultRepository.findById(id, includeGoal);

    if (!keyResult) {
      throw new NotFoundException(`Key result with ID ${id} not found`);
    }

    return keyResult;
  }

  /**
   * Update key result
   */
  async updateKeyResult(id: number, updateDto: any, updatedBy?: number): Promise<KeyResult> {
    const keyResult = await this.keyResultRepository.findById(id);

    if (!keyResult) {
      throw new NotFoundException(`Key result with ID ${id} not found`);
    }

    // If updating current value, recalculate progress
    if (updateDto.currentValue !== undefined) {
      keyResult.currentValue = updateDto.currentValue;
      keyResult.progressPercentage = this.calculateProgress(
        keyResult.startingValue,
        keyResult.currentValue,
        keyResult.targetValue,
      );

      // Update status based on progress
      if (keyResult.progressPercentage >= 100) {
        keyResult.status = KeyResultStatus.COMPLETED;
        keyResult.actualCompletionDate = new Date();
      } else if (keyResult.progressPercentage < 50 && keyResult.progressPercentage > 0) {
        keyResult.status = KeyResultStatus.AT_RISK;
      } else if (keyResult.progressPercentage > 0) {
        keyResult.status = KeyResultStatus.IN_PROGRESS;
      }

      keyResult.lastUpdatedDate = new Date();
    }

    Object.assign(keyResult, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.keyResultRepository.save(keyResult);

    // Update goal progress
    await this.goalService.calculateGoalProgress(keyResult.goalId);

    this.logger.log(`Updated key result: ${id}`);

    return saved;
  }

  /**
   * Record check-in for key result
   */
  async recordCheckIn(
    keyResultId: number,
    checkInData: {
      value: number;
      notes?: string;
    },
    updatedBy?: number,
  ): Promise<KeyResult> {
    const keyResult = await this.keyResultRepository.findById(keyResultId);

    if (!keyResult) {
      throw new NotFoundException(`Key result with ID ${keyResultId} not found`);
    }

    // Update current value
    keyResult.currentValue = checkInData.value;
    keyResult.progressPercentage = this.calculateProgress(
      keyResult.startingValue,
      keyResult.currentValue,
      keyResult.targetValue,
    );

    // Update status
    if (keyResult.progressPercentage >= 100) {
      keyResult.status = KeyResultStatus.COMPLETED;
      keyResult.actualCompletionDate = new Date();
    } else if (keyResult.progressPercentage < 50 && keyResult.progressPercentage > 0) {
      keyResult.status = KeyResultStatus.AT_RISK;
    } else if (keyResult.progressPercentage > 0) {
      keyResult.status = KeyResultStatus.IN_PROGRESS;
    }

    keyResult.lastUpdatedDate = new Date();

    // Add to check-in history
    const checkInHistory = keyResult.checkInHistory || [];
    checkInHistory.push({
      id: `${Date.now()}-${Math.random()}`,
      date: new Date().toISOString(),
      value: checkInData.value,
      notes: checkInData.notes,
      updatedBy: updatedBy || 0,
    });

    keyResult.checkInHistory = checkInHistory;
    keyResult.updatedBy = updatedBy ?? null;

    const saved = await this.keyResultRepository.save(keyResult);

    // Update goal progress
    await this.goalService.calculateGoalProgress(keyResult.goalId);

    this.logger.log(`Recorded check-in for key result: ${keyResultId}`);

    return saved;
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(
    startingValue: number,
    currentValue: number,
    targetValue: number,
  ): number {
    if (targetValue === startingValue) {
      return currentValue >= targetValue ? 100 : 0;
    }

    const progress = ((currentValue - startingValue) / (targetValue - startingValue)) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Get key results by goal
   */
  async getKeyResultsByGoal(goalId: number): Promise<KeyResult[]> {
    return this.keyResultRepository.findByGoal(goalId);
  }

  /**
   * Get key results by owner
   */
  async getKeyResultsByOwner(ownerId: number, organizationId?: number): Promise<KeyResult[]> {
    return this.keyResultRepository.findByOwner(ownerId, organizationId);
  }

  /**
   * Get key results at risk
   */
  async getKeyResultsAtRisk(organizationId?: number): Promise<KeyResult[]> {
    return this.keyResultRepository.findAtRisk(organizationId);
  }

  /**
   * Delete key result
   */
  async deleteKeyResult(id: number): Promise<void> {
    const keyResult = await this.keyResultRepository.findById(id);

    if (!keyResult) {
      throw new NotFoundException(`Key result with ID ${id} not found`);
    }

    await this.keyResultRepository.remove(keyResult);

    // Update goal progress
    await this.goalService.calculateGoalProgress(keyResult.goalId);

    this.logger.log(`Deleted key result: ${id}`);
  }
}
