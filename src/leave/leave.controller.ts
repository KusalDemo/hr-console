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
import { LeavePolicyService } from './services/leave-policy.service';
import { LeaveAccrualService } from './services/leave-accrual.service';
import {
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  CloneLeavePolicyDto,
  AssignPolicyToEmployeeDto,
  LeavePolicyResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Leave Controller
 *
 * REST API endpoints for leave policy management:
 * - Leave policies (CRUD, templates, cloning)
 * - Employee policy assignments
 * - Accrual calculations
 */
@Controller('leave/policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(
    private readonly policyService: LeavePolicyService,
    private readonly accrualService: LeaveAccrualService,
  ) {}

  // ========== Policy Endpoints ==========

  /**
   * Create a new leave policy
   * POST /leave/policies
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createPolicy(@Body() createDto: CreateLeavePolicyDto, @CurrentUser() user: JwtPayload) {
    const policy = await this.policyService.createPolicy(
      {
        ...createDto,
        effectiveStartDate: new Date(createDto.effectiveStartDate),
        effectiveEndDate: createDto.effectiveEndDate
          ? new Date(createDto.effectiveEndDate)
          : undefined,
        accrualStartDate: createDto.accrualStartDate
          ? new Date(createDto.accrualStartDate)
          : undefined,
        carryOverExpiryDate: createDto.carryOverExpiryDate
          ? new Date(createDto.carryOverExpiryDate)
          : undefined,
      },
      user.userId,
    );
    return LeavePolicyResponseDto.fromEntity(policy);
  }

  /**
   * Get policy by ID
   * GET /leave/policies/:id
   */
  @Get(':id')
  async getPolicy(@Param('id', ParseIntPipe) id: number) {
    const policy = await this.policyService.getPolicyById(id);
    return LeavePolicyResponseDto.fromEntity(policy);
  }

  /**
   * Get policy by key
   * GET /leave/policies/key/:policyKey
   */
  @Get('key/:policyKey')
  async getPolicyByKey(@Param('policyKey') policyKey: string) {
    const policy = await this.policyService.getPolicyByKey(policyKey);
    return LeavePolicyResponseDto.fromEntity(policy);
  }

  /**
   * Update policy
   * PUT /leave/policies/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR')
  async updatePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLeavePolicyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const policy = await this.policyService.updatePolicy(
      id,
      {
        ...updateDto,
        effectiveStartDate: updateDto.effectiveStartDate
          ? new Date(updateDto.effectiveStartDate)
          : undefined,
        effectiveEndDate: updateDto.effectiveEndDate
          ? new Date(updateDto.effectiveEndDate)
          : undefined,
        accrualStartDate: updateDto.accrualStartDate
          ? new Date(updateDto.accrualStartDate)
          : undefined,
        carryOverExpiryDate: updateDto.carryOverExpiryDate
          ? new Date(updateDto.carryOverExpiryDate)
          : undefined,
      },
      user.userId,
    );
    return LeavePolicyResponseDto.fromEntity(policy);
  }

  /**
   * Clone policy
   * POST /leave/policies/:id/clone
   */
  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async clonePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() cloneDto: CloneLeavePolicyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const policy = await this.policyService.clonePolicy(
      id,
      {
        ...cloneDto,
        effectiveStartDate: new Date(cloneDto.effectiveStartDate),
        effectiveEndDate: cloneDto.effectiveEndDate
          ? new Date(cloneDto.effectiveEndDate)
          : undefined,
      },
      user.userId,
    );
    return LeavePolicyResponseDto.fromEntity(policy);
  }

  /**
   * Get active policies
   * GET /leave/policies/active
   */
  @Get('active')
  async getActivePolicies(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    const policies = await this.policyService.getActivePolicies(organizationId);
    return policies.map((p) => LeavePolicyResponseDto.fromEntity(p));
  }

  /**
   * Get template policies
   * GET /leave/policies/templates
   */
  @Get('templates')
  async getTemplatePolicies(@Query('category') category?: string) {
    const policies = await this.policyService.getTemplatePolicies(category);
    return policies.map((p) => LeavePolicyResponseDto.fromEntity(p));
  }

  /**
   * Search policies
   * GET /leave/policies/search
   */
  @Get('search')
  async searchPolicies(
    @Query('searchTerm') searchTerm?: string,
    @Query('isTemplate', new ParseBoolPipe({ optional: true })) isTemplate?: boolean,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @Query('category') category?: string,
  ) {
    const policies = await this.policyService.searchPolicies({
      searchTerm,
      isTemplate,
      isActive,
      category,
    });
    return policies.map((p) => LeavePolicyResponseDto.fromEntity(p));
  }

  // ========== Assignment Endpoints ==========

  /**
   * Assign policy to employee
   * POST /leave/policies/assign
   */
  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async assignPolicyToEmployee(
    @Body() assignDto: AssignPolicyToEmployeeDto & { employeeId: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.policyService.assignPolicyToEmployee(
      assignDto.employeeId,
      assignDto.policyId,
      {
        priority: assignDto.priority,
        effectiveStartDate: new Date(assignDto.effectiveStartDate),
        effectiveEndDate: assignDto.effectiveEndDate
          ? new Date(assignDto.effectiveEndDate)
          : undefined,
        assignmentNotes: assignDto.assignmentNotes,
      },
      user.userId,
    );
  }

  /**
   * Get employee's policy assignments
   * GET /leave/policies/assignments/employee/:employeeId
   */
  @Get('assignments/employee/:employeeId')
  async getEmployeeAssignments(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.policyService.getEmployeeAssignments(employeeId, includeInactive);
  }

  /**
   * Get employee's primary policy
   * GET /leave/policies/employee/:employeeId/primary
   */
  @Get('employee/:employeeId/primary')
  async getEmployeePrimaryPolicy(@Param('employeeId', ParseIntPipe) employeeId: number) {
    const policy = await this.policyService.getEmployeePrimaryPolicy(employeeId);
    return policy ? LeavePolicyResponseDto.fromEntity(policy) : null;
  }

  /**
   * Update assignment priority
   * PUT /leave/policies/assignments/:id/priority
   */
  @Put('assignments/:id/priority')
  @Roles('ADMIN', 'HR')
  async updateAssignmentPriority(
    @Param('id', ParseIntPipe) id: number,
    @Body('priority', ParseIntPipe) priority: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.policyService.updateAssignmentPriority(id, priority, user.userId);
  }

  /**
   * Remove policy assignment
   * DELETE /leave/policies/assignments/:id
   */
  @Delete('assignments/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAssignment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    await this.policyService.removeAssignment(id, user.userId);
  }
}
