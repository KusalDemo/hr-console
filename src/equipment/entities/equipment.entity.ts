import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { EquipmentAssignment } from './equipment-assignment.entity';
import { EquipmentMaintenance } from './equipment-maintenance.entity';
import { EquipmentBooking } from './equipment-booking.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Equipment Status Enum
 */
export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE', // Available for assignment
  ASSIGNED = 'ASSIGNED', // Assigned to employee
  MAINTENANCE = 'MAINTENANCE', // Under maintenance
  RETIRED = 'RETIRED', // Retired/archived
  LOST = 'LOST', // Lost
  DAMAGED = 'DAMAGED', // Damaged
}

/**
 * Equipment Entity
 * 
 * Lifecycle asset management with asset tags, categories, locations, maintenance schedules.
 */
@Entity('equipment')
@Index('idx_equipment_asset_tag', ['assetTag'])
@Index('idx_equipment_category', ['category'])
@Index('idx_equipment_status', ['equipmentStatus'])
@Index('idx_equipment_organization', ['organizationId'])
@Index('idx_equipment_location', ['locationId'])
@Index('idx_equipment_parent', ['parentEquipmentId'])
@Index('idx_equipment_active', ['isActive'])
export class Equipment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Asset tag (unique identifier)
   */
  @Column({ name: 'asset_tag', type: 'varchar', length: 128, unique: true, nullable: false })
  assetTag: string;

  /**
   * Equipment name
   */
  @Column({ name: 'equipment_name', type: 'varchar', length: 255, nullable: false })
  equipmentName: string;

  /**
   * Equipment description
   */
  @Column({ name: 'equipment_description', type: 'text', nullable: true })
  equipmentDescription: string | null;

  /**
   * Equipment category
   */
  @Column({ name: 'category', type: 'varchar', length: 128, nullable: true })
  category: string | null;

  /**
   * Equipment type (LAPTOP, PHONE, VEHICLE, FURNITURE, etc.)
   */
  @Column({ name: 'equipment_type', type: 'varchar', length: 64, nullable: true })
  equipmentType: string | null;

  /**
   * Equipment status
   */
  @Column({
    name: 'equipment_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: EquipmentStatus.AVAILABLE,
  })
  equipmentStatus: EquipmentStatus;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Organization relationship
   */
  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * Location ID
   */
  @Column({ name: 'location_id', type: 'bigint', nullable: true })
  locationId: number | null;

  /**
   * Location name/address (for quick reference)
   */
  @Column({ name: 'location_name', type: 'varchar', length: 255, nullable: true })
  locationName: string | null;

  /**
   * Parent equipment ID (for asset hierarchy)
   */
  @Column({ name: 'parent_equipment_id', type: 'bigint', nullable: true })
  parentEquipmentId: number | null;

  /**
   * Parent equipment relationship
   */
  @ManyToOne(() => Equipment, (equipment) => equipment.childEquipment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_equipment_id' })
  parentEquipment: Equipment | null;

  /**
   * Child equipment (for asset hierarchy)
   */
  @OneToMany(() => Equipment, (equipment) => equipment.parentEquipment, {
    cascade: false,
    lazy: true,
  })
  childEquipment: Promise<Equipment[]> | Equipment[];

  /**
   * Serial number
   */
  @Column({ name: 'serial_number', type: 'varchar', length: 128, nullable: true })
  serialNumber: string | null;

  /**
   * Model number
   */
  @Column({ name: 'model_number', type: 'varchar', length: 128, nullable: true })
  modelNumber: string | null;

  /**
   * Manufacturer
   */
  @Column({ name: 'manufacturer', type: 'varchar', length: 128, nullable: true })
  manufacturer: string | null;

  /**
   * Purchase date
   */
  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: Date | null;

  /**
   * Purchase cost
   */
  @Column({ name: 'purchase_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchaseCost: number | null;

  /**
   * Current value (depreciated value)
   */
  @Column({ name: 'current_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  currentValue: number | null;

  /**
   * Depreciation method (STRAIGHT_LINE, DECLINING_BALANCE, etc.)
   */
  @Column({ name: 'depreciation_method', type: 'varchar', length: 64, nullable: true })
  depreciationMethod: string | null;

  /**
   * Useful life (in years)
   */
  @Column({ name: 'useful_life_years', type: 'integer', nullable: true })
  usefulLifeYears: number | null;

  /**
   * Warranty start date
   */
  @Column({ name: 'warranty_start_date', type: 'date', nullable: true })
  warrantyStartDate: Date | null;

  /**
   * Warranty end date
   */
  @Column({ name: 'warranty_end_date', type: 'date', nullable: true })
  warrantyEndDate: Date | null;

  /**
   * Warranty provider
   */
  @Column({ name: 'warranty_provider', type: 'varchar', length: 255, nullable: true })
  warrantyProvider: string | null;

  /**
   * Warranty details/notes
   */
  @Column({ name: 'warranty_details', type: 'text', nullable: true })
  warrantyDetails: string | null;

  /**
   * Maintenance schedule (JSON: { "frequency": "monthly", "interval": 3, "type": "preventive" })
   */
  @Column({ name: 'maintenance_schedule', type: 'jsonb', nullable: true })
  maintenanceSchedule: Record<string, any> | null;

  /**
   * Next maintenance date
   */
  @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
  nextMaintenanceDate: Date | null;

  /**
   * Last maintenance date
   */
  @Column({ name: 'last_maintenance_date', type: 'date', nullable: true })
  lastMaintenanceDate: Date | null;

  /**
   * Whether equipment is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Equipment metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'equipment_metadata', type: 'jsonb', nullable: true })
  equipmentMetadata: Record<string, any> | null;

  /**
   * Equipment assignments
   */
  @OneToMany(() => EquipmentAssignment, (assignment) => assignment.equipment, {
    cascade: false,
    lazy: true,
  })
  assignments: Promise<EquipmentAssignment[]> | EquipmentAssignment[];

  /**
   * Equipment maintenance history
   */
  @OneToMany(() => EquipmentMaintenance, (maintenance) => maintenance.equipment, {
    cascade: false,
    lazy: true,
  })
  maintenanceHistory: Promise<EquipmentMaintenance[]> | EquipmentMaintenance[];

  /**
   * Whether equipment is available for booking
   */
  @Column({ name: 'is_bookable', type: 'boolean', nullable: false, default: false })
  isBookable: boolean;

  /**
   * Booking availability rules (JSONB)
   * Example: {
   *   "advanceBookingDays": 30,
   *   "maxBookingDays": 7,
   *   "minBookingDays": 1,
   *   "requiresApproval": true,
   *   "allowedTimeSlots": ["09:00-17:00"],
   *   "blackoutDates": ["2024-12-25"],
   *   "bookingPolicy": "first_come_first_served"
   * }
   */
  @Column({ name: 'booking_availability_rules', type: 'jsonb', nullable: true })
  bookingAvailabilityRules: Record<string, any> | null;

  /**
   * Maximum concurrent bookings allowed (null = unlimited)
   */
  @Column({ name: 'max_concurrent_bookings', type: 'integer', nullable: true })
  maxConcurrentBookings: number | null;

  /**
   * Equipment bookings
   */
  @OneToMany(() => EquipmentBooking, (booking) => booking.equipment, {
    cascade: false,
    lazy: true,
  })
  bookings: Promise<EquipmentBooking[]> | EquipmentBooking[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
