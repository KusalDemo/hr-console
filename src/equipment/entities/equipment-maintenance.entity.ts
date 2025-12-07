import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Equipment } from './equipment.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Maintenance Type Enum
 */
export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE', // Preventive maintenance
  CORRECTIVE = 'CORRECTIVE', // Corrective maintenance
  EMERGENCY = 'EMERGENCY', // Emergency repair
  INSPECTION = 'INSPECTION', // Inspection
  UPGRADE = 'UPGRADE', // Upgrade/update
}

/**
 * Maintenance Status Enum
 */
export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED', // Scheduled
  IN_PROGRESS = 'IN_PROGRESS', // In progress
  COMPLETED = 'COMPLETED', // Completed
  CANCELLED = 'CANCELLED', // Cancelled
  DEFERRED = 'DEFERRED', // Deferred
}

/**
 * Equipment Maintenance Entity
 * 
 * Maintenance history for equipment with scheduling and tracking.
 */
@Entity('equipment_maintenance')
@Index('idx_equipment_maintenance_equipment', ['equipmentId'])
@Index('idx_equipment_maintenance_status', ['maintenanceStatus'])
@Index('idx_equipment_maintenance_type', ['maintenanceType'])
@Index('idx_equipment_maintenance_date', ['scheduledDate', 'completedDate'])
export class EquipmentMaintenance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to equipment
   */
  @Column({ name: 'equipment_id', type: 'bigint', nullable: false })
  equipmentId: number;

  /**
   * Equipment relationship
   */
  @ManyToOne(() => Equipment, (equipment) => equipment.maintenanceHistory, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * Maintenance type
   */
  @Column({
    name: 'maintenance_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: MaintenanceType.PREVENTIVE,
  })
  maintenanceType: MaintenanceType;

  /**
   * Maintenance status
   */
  @Column({
    name: 'maintenance_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: MaintenanceStatus.SCHEDULED,
  })
  maintenanceStatus: MaintenanceStatus;

  /**
   * Maintenance title/description
   */
  @Column({ name: 'maintenance_title', type: 'varchar', length: 255, nullable: false })
  maintenanceTitle: string;

  /**
   * Maintenance description
   */
  @Column({ name: 'maintenance_description', type: 'text', nullable: true })
  maintenanceDescription: string | null;

  /**
   * Scheduled date
   */
  @Column({ name: 'scheduled_date', type: 'date', nullable: false })
  scheduledDate: Date;

  /**
   * Completed date
   */
  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date | null;

  /**
   * Assigned technician/vendor
   */
  @Column({ name: 'technician_id', type: 'bigint', nullable: true })
  technicianId: number | null;

  /**
   * Technician relationship
   */
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'technician_id' })
  technician: Employee | null;

  /**
   * Vendor/service provider
   */
  @Column({ name: 'vendor', type: 'varchar', length: 255, nullable: true })
  vendor: string | null;

  /**
   * Maintenance cost
   */
  @Column({ name: 'maintenance_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maintenanceCost: number | null;

  /**
   * Parts replaced (JSON array)
   */
  @Column({ name: 'parts_replaced', type: 'jsonb', nullable: true })
  partsReplaced: Array<{ partName: string; partNumber?: string; cost?: number }> | null;

  /**
   * Maintenance notes
   */
  @Column({ name: 'maintenance_notes', type: 'text', nullable: true })
  maintenanceNotes: string | null;

  /**
   * Next maintenance date (calculated after completion)
   */
  @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
  nextMaintenanceDate: Date | null;

  /**
   * Maintenance metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'maintenance_metadata', type: 'jsonb', nullable: true })
  maintenanceMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
