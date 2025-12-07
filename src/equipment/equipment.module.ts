import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentController } from './equipment.controller';
import { EquipmentService, EquipmentBookingService } from './services';
import {
  EquipmentRepository,
  EquipmentAssignmentRepository,
  EquipmentMaintenanceRepository,
  EquipmentBookingRepository,
} from './repositories';
import {
  Equipment,
  EquipmentAssignment,
  EquipmentMaintenance,
  EquipmentBooking,
} from './entities';
import { Organization } from '../organizations/entities/organization.entity';
import { Employee } from '../employees/entities/employee.entity';
import { WorkflowsModule } from '../workflows/workflows.module';

/**
 * Equipment Module
 * 
 * Provides lifecycle asset management with:
 * - Equipment CRUD operations with asset tags, categories, locations
 * - Equipment assignments to employees
 * - Maintenance scheduling and history
 * - Depreciation tracking
 * - Warranty management
 * - Equipment status workflow (available, assigned, maintenance, retired)
 * - Support for asset hierarchy, parent-child relationships
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Equipment,
      EquipmentAssignment,
      EquipmentMaintenance,
      EquipmentBooking,
      Organization,
      Employee,
    ]),
    WorkflowsModule,
  ],
  controllers: [EquipmentController],
  providers: [
    EquipmentService,
    EquipmentBookingService,
    EquipmentRepository,
    EquipmentAssignmentRepository,
    EquipmentMaintenanceRepository,
    EquipmentBookingRepository,
  ],
  exports: [
    EquipmentService,
    EquipmentBookingService,
    EquipmentRepository,
    EquipmentAssignmentRepository,
    EquipmentMaintenanceRepository,
    EquipmentBookingRepository,
  ],
})
export class EquipmentModule {}
