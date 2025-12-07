import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { GoalService } from './services/goal.service';
import { KeyResultService } from './services/key-result.service';
import {
  CreateGoalDto,
  UpdateGoalDto,
  CreateKeyResultDto,
  UpdateKeyResultDto,
  GoalCheckInDto,
  KeyResultCheckInDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { GoalType, GoalStatus } from './entities/goal.entity';

/**
 * Goals Controller
 * 
 * REST API endpoints for goals and OKR management:
 * - Goals (CRUD, alignment, cloning, templates)
 * - Key results (CRUD, progress tracking)
 * - Check-ins
 * - Progress tracking
 * - Goal alignment chains
 */
@Controller('goals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GoalsController {
  constructor(
    private readonly goalService: GoalService,
    private readonly keyResultService: KeyResultService,
  ) {}

  // ========== Goal Endpoints ==========

  /**
   * Create a new goal
   * POST /goals
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async createGoal(
    @Body() createDto: CreateGoalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.goalService.createGoal(
      {
        ...createDto,
        periodStart: new Date(createDto.periodStart),
        periodEnd: new Date(createDto.periodEnd),
        targetCompletionDate: createDto.targetCompletionDate
          ? new Date(createDto.targetCompletionDate)
          : undefined,
      },
      user.userId,
    );
  }

  /**
   * Get goal by ID
   * GET /goals/:id
   */
  @Get(':id')
  async getGoal(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeKeyResults', new ParseBoolPipe({ optional: true })) includeKeyResults = false,
    @Query('includeChildren', new ParseBoolPipe({ optional: true })) includeChildren = false,
  ) {
    return this.goalService.getGoalById(id, includeKeyResults, includeChildren);
  }

  /**
   * Update goal
   * PUT /goals/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updateGoal(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGoalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.goalService.updateGoal(
      id,
      {
        ...updateDto,
        periodStart: updateDto.periodStart ? new Date(updateDto.periodStart) : undefined,
        periodEnd: updateDto.periodEnd ? new Date(updateDto.periodEnd) : undefined,
        targetCompletionDate: updateDto.targetCompletionDate
          ? new Date(updateDto.targetCompletionDate)
          : undefined,
      },
      user.userId,
    );
  }

  /**
   * Delete goal (archive)
   * DELETE /goals/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async deleteGoal(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.goalService.deleteGoal(id, user.userId);
  }

  /**
   * Clone goal
   * POST /goals/:id/clone
   */
  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async cloneGoal(
    @Param('id', ParseIntPipe) id: number,
    @Body('newOwnerId', ParseIntPipe) newOwnerId: number,
    @Body('newPeriodStart') newPeriodStart: string,
    @Body('newPeriodEnd') newPeriodEnd: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.goalService.cloneGoal(
      id,
      newOwnerId,
      new Date(newPeriodStart),
      new Date(newPeriodEnd),
      user.userId,
    );
  }

  /**
   * Align goal to parent
   * POST /goals/:id/align
   */
  @Post(':id/align')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async alignGoalToParent(
    @Param('id', ParseIntPipe) id: number,
    @Body('parentGoalId', ParseIntPipe) parentGoalId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.goalService.alignGoalToParent(id, parentGoalId, user.userId);
  }

  /**
   * Get goal alignment chain
   * GET /goals/:id/alignment-chain
   */
  @Get(':id/alignment-chain')
  async getGoalAlignmentChain(@Param('id', ParseIntPipe) id: number) {
    return this.goalService.getGoalAlignmentChain(id);
  }

  /**
   * Get descendant goals
   * GET /goals/:id/descendants
   */
  @Get(':id/descendants')
  async getDescendantGoals(@Param('id', ParseIntPipe) id: number) {
    return this.goalService.getDescendantGoals(id);
  }

  /**
   * Record check-in for goal
   * POST /goals/:id/check-in
   */
  @Post(':id/check-in')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async recordGoalCheckIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() checkInDto: GoalCheckInDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.goalService.recordCheckIn(id, checkInDto, user.userId);
  }

  /**
   * Update goal status
   * PUT /goals/:id/status
   */
  @Put(':id/status')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updateGoalStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: GoalStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.goalService.updateGoalStatus(id, status, user.userId);
  }

  /**
   * Get goals by owner
   * GET /goals/owner/:ownerId
   */
  @Get('owner/:ownerId')
  async getGoalsByOwner(
    @Param('ownerId', ParseIntPipe) ownerId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ) {
    return this.goalService.getGoalsByOwner(ownerId, organizationId, includeArchived);
  }

  /**
   * Get goals by type
   * GET /goals/type/:type
   */
  @Get('type/:type')
  async getGoalsByType(
    @Param('type') type: GoalType,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ) {
    return this.goalService.getGoalsByType(type, organizationId, includeArchived);
  }

  /**
   * Get goals in period
   * GET /goals/period
   */
  @Get('period')
  async getGoalsInPeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('goalType') goalType?: GoalType,
  ) {
    return this.goalService.getGoalsInPeriod(
      new Date(startDate),
      new Date(endDate),
      organizationId,
      goalType,
    );
  }

  /**
   * Get goals needing check-in
   * GET /goals/needing-check-in
   */
  @Get('needing-check-in')
  async getGoalsNeedingCheckIn(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('beforeDate') beforeDate?: string,
  ) {
    return this.goalService.getGoalsNeedingCheckIn(
      organizationId,
      beforeDate ? new Date(beforeDate) : undefined,
    );
  }

  /**
   * Get goal templates
   * GET /goals/templates
   */
  @Get('templates')
  async getGoalTemplates(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.goalService.getGoalTemplates(organizationId);
  }

  /**
   * Search goals
   * GET /goals/search
   */
  @Get('search')
  async searchGoals(
    @Query('searchTerm') searchTerm?: string,
    @Query('goalType') goalType?: GoalType,
    @Query('status') status?: GoalStatus,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('ownerId', new ParseIntPipe({ optional: true })) ownerId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ) {
    return this.goalService.searchGoals({
      searchTerm,
      goalType,
      status,
      organizationId,
      ownerId,
      includeArchived,
    });
  }

  // ========== Key Result Endpoints ==========

  /**
   * Create a new key result
   * POST /goals/key-results
   */
  @Post('key-results')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async createKeyResult(
    @Body() createDto: CreateKeyResultDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.keyResultService.createKeyResult(createDto, user.userId);
  }

  /**
   * Get key result by ID
   * GET /goals/key-results/:id
   */
  @Get('key-results/:id')
  async getKeyResult(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeGoal', new ParseBoolPipe({ optional: true })) includeGoal = false,
  ) {
    return this.keyResultService.getKeyResultById(id, includeGoal);
  }

  /**
   * Update key result
   * PUT /goals/key-results/:id
   */
  @Put('key-results/:id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updateKeyResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateKeyResultDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.keyResultService.updateKeyResult(id, updateDto, user.userId);
  }

  /**
   * Delete key result
   * DELETE /goals/key-results/:id
   */
  @Delete('key-results/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async deleteKeyResult(@Param('id', ParseIntPipe) id: number) {
    await this.keyResultService.deleteKeyResult(id);
  }

  /**
   * Record check-in for key result
   * POST /goals/key-results/:id/check-in
   */
  @Post('key-results/:id/check-in')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async recordKeyResultCheckIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() checkInDto: KeyResultCheckInDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.keyResultService.recordCheckIn(id, checkInDto, user.userId);
  }

  /**
   * Get key results by goal
   * GET /goals/:goalId/key-results
   */
  @Get(':goalId/key-results')
  async getKeyResultsByGoal(@Param('goalId', ParseIntPipe) goalId: number) {
    return this.keyResultService.getKeyResultsByGoal(goalId);
  }

  /**
   * Get key results by owner
   * GET /goals/key-results/owner/:ownerId
   */
  @Get('key-results/owner/:ownerId')
  async getKeyResultsByOwner(
    @Param('ownerId', ParseIntPipe) ownerId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.keyResultService.getKeyResultsByOwner(ownerId, organizationId);
  }

  /**
   * Get key results at risk
   * GET /goals/key-results/at-risk
   */
  @Get('key-results/at-risk')
  @Roles('ADMIN', 'HR')
  async getKeyResultsAtRisk(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.keyResultService.getKeyResultsAtRisk(organizationId);
  }
}
