import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveController } from './leave.controller';
import { LeavePolicyService, LeaveAccrualService, LeaveRequestService } from './services';
import {
  LeavePolicyRepository,
  EmployeeLeavePolicyAssignmentRepository,
  LeaveRequestRepository,
} from './repositories';
import { LeavePolicy, LeaveRequest, EmployeeLeavePolicyAssignment } from './entities';
import { Employee } from '../employees/entities/employee.entity';
import { WorkflowsModule } from '../workflows/workflows.module';

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
    TypeOrmModule.forFeature([LeavePolicy, LeaveRequest, EmployeeLeavePolicyAssignment, Employee]),
    WorkflowsModule,
  ],
  controllers: [LeaveController],
  providers: [
    LeavePolicyService,
    LeaveAccrualService,
    LeaveRequestService,
    LeavePolicyRepository,
    EmployeeLeavePolicyAssignmentRepository,
    LeaveRequestRepository,
  ],
  exports: [
    LeavePolicyService,
    LeaveAccrualService,
    LeaveRequestService,
    LeavePolicyRepository,
    EmployeeLeavePolicyAssignmentRepository,
    LeaveRequestRepository,
  ],
})
export class LeaveModule {}
