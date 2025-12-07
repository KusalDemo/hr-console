import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './services';
import {
  EquipmentRepository,
  EquipmentAssignmentRepository,
  EquipmentMaintenanceRepository,
} from './repositories';
import {
  Equipment,
  EquipmentAssignment,
  EquipmentMaintenance,
} from './entities';
import { Organization } from '../organizations/entities/organization.entity';
import { Employee } from '../employees/entities/employee.entity';

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
      Organization,
      Employee,
    ]),
  ],
  controllers: [EquipmentController],
  providers: [
    EquipmentService,
    EquipmentRepository,
    EquipmentAssignmentRepository,
    EquipmentMaintenanceRepository,
  ],
  exports: [
    EquipmentService,
    EquipmentRepository,
    EquipmentAssignmentRepository,
    EquipmentMaintenanceRepository,
  ],
})
export class EquipmentModule {}
