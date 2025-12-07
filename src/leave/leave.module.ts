import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveController } from './leave.controller';
import { LeavePolicyService, LeaveAccrualService } from './services';
import {
  LeavePolicyRepository,
  EmployeeLeavePolicyAssignmentRepository,
} from './repositories';
import {
  LeavePolicy,
  LeaveRequest,
  EmployeeLeavePolicyAssignment,
} from './entities';
import { Employee } from '../employees/entities/employee.entity';

/**
 * Leave Module
 * 
 * Provides leave policy management with:
 * - Leave policy CRUD operations
 * - Policy templates and cloning
 * - Employee policy assignments with priorities
 * - Accrual calculation service
 * - Carry-over rules
 * - Waiting periods and probationary restrictions
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeavePolicy,
      LeaveRequest,
      EmployeeLeavePolicyAssignment,
      Employee,
    ]),
  ],
  controllers: [LeaveController],
  providers: [
    LeavePolicyService,
    LeaveAccrualService,
    LeavePolicyRepository,
    EmployeeLeavePolicyAssignmentRepository,
  ],
  exports: [
    LeavePolicyService,
    LeaveAccrualService,
    LeavePolicyRepository,
    EmployeeLeavePolicyAssignmentRepository,
  ],
})
export class LeaveModule {}
