import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LeavePolicyRepository } from '../repositories/leave-policy.repository';
import { EmployeeLeavePolicyAssignmentRepository } from '../repositories/employee-leave-policy-assignment.repository';
import { LeavePolicy } from '../entities/leave-policy.entity';
import { EmployeeLeavePolicyAssignment } from '../entities/employee-leave-policy-assignment.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Leave Policy Service
 *
 * Manages leave policies with:
 * - Policy CRUD operations
 * - Policy templates and cloning
 * - Employee policy assignments
 * - Policy priority management
 */
@Injectable()
export class LeavePolicyService {
  private readonly logger = new Logger(LeavePolicyService.name);

  constructor(
    private readonly policyRepository: LeavePolicyRepository,
    private readonly assignmentRepository: EmployeeLeavePolicyAssignmentRepository,
  ) {}

  // ========== Policy Methods ==========

  /**
   * Create a new leave policy
   */
  async createPolicy(createDto: any, createdBy?: number): Promise<LeavePolicy> {
    // Check if policy key already exists
    if (createDto.policyKey) {
      const existing = await this.policyRepository.findByPolicyKey(createDto.policyKey);
      if (existing) {
        throw new ConflictException(`Policy with key ${createDto.policyKey} already exists`);
      }
    }

    const policy = this.policyRepository.create({
      ...createDto,
      active: createDto.active !== undefined ? createDto.active : false,
      isTemplate: createDto.isTemplate || false,
      createdBy,
    });

    const saved = await this.policyRepository.save(policy);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Created leave policy: ${savedEntity.id} (${savedEntity.policyName})`);

    return savedEntity;
  }

  /**
   * Get policy by ID
   */
  async getPolicyById(id: number): Promise<LeavePolicy> {
    const policy = await this.policyRepository.findById(id);

    if (!policy) {
      throw new NotFoundException(`Leave policy with ID ${id} not found`);
    }

    return policy;
  }

  /**
   * Get policy by key
   */
  async getPolicyByKey(policyKey: string): Promise<LeavePolicy> {
    const policy = await this.policyRepository.findByPolicyKey(policyKey);

    if (!policy) {
      throw new NotFoundException(`Leave policy with key ${policyKey} not found`);
    }

    return policy;
  }

  /**
   * Update policy
   */
  async updatePolicy(id: number, updateDto: any, updatedBy?: number): Promise<LeavePolicy> {
    const policy = await this.policyRepository.findById(id);

    if (!policy) {
      throw new NotFoundException(`Leave policy with ID ${id} not found`);
    }

    // Check policy key uniqueness if changed
    if (updateDto.policyKey && updateDto.policyKey !== policy.policyKey) {
      const existing = await this.policyRepository.findByPolicyKey(updateDto.policyKey);
      if (existing) {
        throw new ConflictException(`Policy with key ${updateDto.policyKey} already exists`);
      }
    }

    Object.assign(policy, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.policyRepository.save(policy);

    this.logger.log(`Updated leave policy: ${id}`);

    return saved;
  }

  /**
   * Clone policy from template or existing policy
   */
  async clonePolicy(
    sourcePolicyId: number,
    cloneData: {
      policyName: string;
      policyKey?: string;
      effectiveStartDate: Date;
      effectiveEndDate?: Date;
      isTemplate?: boolean;
    },
    createdBy?: number,
  ): Promise<LeavePolicy> {
    const sourcePolicy = await this.policyRepository.findById(sourcePolicyId);

    if (!sourcePolicy) {
      throw new NotFoundException(`Source policy with ID ${sourcePolicyId} not found`);
    }

    // Check policy key uniqueness if provided
    if (cloneData.policyKey) {
      const existing = await this.policyRepository.findByPolicyKey(cloneData.policyKey);
      if (existing) {
        throw new ConflictException(`Policy with key ${cloneData.policyKey} already exists`);
      }
    }

    // Create new policy based on source
    const clonedPolicy = this.policyRepository.create({
      policyKey: cloneData.policyKey || null,
      policyName: cloneData.policyName,
      description: sourcePolicy.description,
      effectiveStartDate: cloneData.effectiveStartDate,
      effectiveEndDate: cloneData.effectiveEndDate || null,
      active: false, // New cloned policy starts as inactive
      isTemplate: cloneData.isTemplate || false,
      templateCategory: sourcePolicy.templateCategory,
      parentPolicyId: sourcePolicy.id, // Reference to source policy
      probationaryPeriodDays: sourcePolicy.probationaryPeriodDays,
      waitingPeriodDays: sourcePolicy.waitingPeriodDays,
      waitingPeriodType: sourcePolicy.waitingPeriodType,
      accrualMethod: sourcePolicy.accrualMethod,
      accrualFrequency: sourcePolicy.accrualFrequency,
      accrualCustomFormula: sourcePolicy.accrualCustomFormula,
      accrualStartDate: sourcePolicy.accrualStartDate,
      accrualCalculationBasis: sourcePolicy.accrualCalculationBasis,
      allowCarryOver: sourcePolicy.allowCarryOver,
      carryOverPercentage: sourcePolicy.carryOverPercentage,
      carryOverMaxDays: sourcePolicy.carryOverMaxDays,
      carryOverExpiryDays: sourcePolicy.carryOverExpiryDays,
      carryOverExpiryDate: sourcePolicy.carryOverExpiryDate,
      allowNegativeBalance: sourcePolicy.allowNegativeBalance,
      maxNegativeBalanceDays: sourcePolicy.maxNegativeBalanceDays,
      prorateOnHire: sourcePolicy.prorateOnHire,
      prorateOnTermination: sourcePolicy.prorateOnTermination,
      prorationMethod: sourcePolicy.prorationMethod,
      policyMetadata: sourcePolicy.policyMetadata,
      createdBy,
    });

    const saved = await this.policyRepository.save(clonedPolicy);

    this.logger.log(`Cloned leave policy: ${sourcePolicyId} -> ${saved.id} (${saved.policyName})`);

    return saved;
  }

  /**
   * Get active policies
   */
  async getActivePolicies(organizationId?: number): Promise<LeavePolicy[]> {
    return this.policyRepository.findActive(organizationId);
  }

  /**
   * Get template policies
   */
  async getTemplatePolicies(category?: string): Promise<LeavePolicy[]> {
    return this.policyRepository.findTemplates(category);
  }

  /**
   * Search policies
   */
  async searchPolicies(filters: {
    searchTerm?: string;
    isTemplate?: boolean;
    isActive?: boolean;
    category?: string;
  }): Promise<LeavePolicy[]> {
    return this.policyRepository.searchPolicies(
      filters.searchTerm,
      filters.isTemplate,
      filters.isActive,
      filters.category,
    );
  }

  // ========== Assignment Methods ==========

  /**
   * Assign policy to employee
   */
  async assignPolicyToEmployee(
    employeeId: number,
    policyId: number,
    assignmentData: {
      priority?: number;
      effectiveStartDate: Date;
      effectiveEndDate?: Date;
      assignmentNotes?: string;
    },
    createdBy?: number,
  ): Promise<EmployeeLeavePolicyAssignment> {
    // Verify policy exists
    const policy = await this.policyRepository.findById(policyId);
    if (!policy) {
      throw new NotFoundException(`Leave policy with ID ${policyId} not found`);
    }

    // Check for existing active assignment
    const existingAssignments = await this.assignmentRepository.findActiveByEmployee(employeeId);
    const conflictingAssignment = existingAssignments.find(
      (a) =>
        a.leavePolicyId === policyId &&
        this.datesOverlap(
          new Date(assignmentData.effectiveStartDate),
          assignmentData.effectiveEndDate ? new Date(assignmentData.effectiveEndDate) : null,
          new Date(a.effectiveStartDate),
          a.effectiveEndDate ? new Date(a.effectiveEndDate) : null,
        ),
    );

    if (conflictingAssignment) {
      throw new ConflictException(
        `Employee already has an active assignment for this policy with overlapping dates`,
      );
    }

    // Determine priority if not provided
    let priority = assignmentData.priority;
    if (priority === undefined) {
      const maxPriority = existingAssignments.reduce((max, a) => Math.max(max, a.priority), 0);
      priority = maxPriority + 1;
    }

    const assignment = this.assignmentRepository.create({
      employeeId,
      leavePolicyId: policyId,
      priority,
      effectiveStartDate: assignmentData.effectiveStartDate,
      effectiveEndDate: assignmentData.effectiveEndDate || null,
      isActive: true,
      assignmentNotes: assignmentData.assignmentNotes,
      createdBy,
    });

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.log(
      `Assigned policy ${policyId} to employee ${employeeId} with priority ${priority}`,
    );

    return saved;
  }

  /**
   * Get employee's active policy assignments
   */
  async getEmployeeAssignments(
    employeeId: number,
    includeInactive = false,
  ): Promise<EmployeeLeavePolicyAssignment[]> {
    if (includeInactive) {
      return this.assignmentRepository.findByEmployee(employeeId);
    }
    return this.assignmentRepository.findActiveByEmployee(employeeId);
  }

  /**
   * Get employee's highest priority active policy
   */
  async getEmployeePrimaryPolicy(employeeId: number): Promise<LeavePolicy | null> {
    const assignments = await this.assignmentRepository.findActiveByEmployee(employeeId);

    if (assignments.length === 0) {
      return null;
    }

    // Sort by priority (lower number = higher priority)
    assignments.sort((a, b) => a.priority - b.priority);

    const primaryAssignment = assignments[0];
    return this.policyRepository.findById(primaryAssignment.leavePolicyId);
  }

  /**
   * Update assignment priority
   */
  async updateAssignmentPriority(
    assignmentId: number,
    newPriority: number,
    updatedBy?: number,
  ): Promise<EmployeeLeavePolicyAssignment> {
    const assignment = await this.assignmentRepository.findById(assignmentId);

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    assignment.priority = newPriority;
    assignment.updatedBy = updatedBy ?? null;

    return this.assignmentRepository.save(assignment);
  }

  /**
   * Remove policy assignment from employee
   */
  async removeAssignment(assignmentId: number, updatedBy?: number): Promise<void> {
    const assignment = await this.assignmentRepository.findById(assignmentId);

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    assignment.isActive = false;
    assignment.updatedBy = updatedBy ?? null;

    await this.assignmentRepository.save(assignment);

    this.logger.log(`Removed policy assignment: ${assignmentId}`);
  }

  // ========== Helper Methods ==========

  /**
   * Check if two date ranges overlap
   */
  private datesOverlap(start1: Date, end1: Date | null, start2: Date, end2: Date | null): boolean {
    // If end dates are null, treat as infinite
    const end1Date = end1 || new Date('9999-12-31');
    const end2Date = end2 || new Date('9999-12-31');

    return start1 <= end2Date && start2 <= end1Date;
  }
}
