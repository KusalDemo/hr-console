import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ResourceBooking } from './resource-booking.entity';

/**
 * Resource Type Enum
 */
export enum ResourceType {
  ROOM = 'ROOM', // Meeting room, conference room
  EQUIPMENT = 'EQUIPMENT', // Equipment (projector, laptop, etc.)
  VEHICLE = 'VEHICLE', // Vehicle
  FACILITY = 'FACILITY', // Facility (gym, cafeteria, etc.)
  OTHER = 'OTHER', // Other resource type
}

/**
 * Resource Status Enum
 */
export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE', // Available for booking
  UNAVAILABLE = 'UNAVAILABLE', // Unavailable (maintenance, etc.)
  RESERVED = 'RESERVED', // Reserved for specific use
  RETIRED = 'RETIRED', // Retired/archived
}

/**
 * Resource Entity
 *
 * Bookable resources (rooms, equipment, vehicles) with capacity, availability, and location mapping.
 */
@Entity('resources')
@Index('idx_resources_type', ['resourceType'])
@Index('idx_resources_status', ['resourceStatus'])
@Index('idx_resources_organization', ['organizationId'])
@Index('idx_resources_category', ['category'])
@Index('idx_resources_location', ['locationId'])
@Index('idx_resources_active', ['isActive'])
export class Resource {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Resource name
   */
  @Column({ name: 'resource_name', type: 'varchar', length: 255, nullable: false })
  resourceName: string;

  /**
   * Resource description
   */
  @Column({ name: 'resource_description', type: 'text', nullable: true })
  resourceDescription: string | null;

  /**
   * Resource type
   */
  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ResourceType.ROOM,
  })
  resourceType: ResourceType;

  /**
   * Resource category (e.g., "Conference Room", "Projector", "Company Car")
   */
  @Column({ name: 'category', type: 'varchar', length: 128, nullable: true })
  category: string | null;

  /**
   * Resource status
   */
  @Column({
    name: 'resource_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ResourceStatus.AVAILABLE,
  })
  resourceStatus: ResourceStatus;

  /**
   * Organization ID (for organization-scoped resources)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Location ID (reference to location/office)
   */
  @Column({ name: 'location_id', type: 'bigint', nullable: true })
  locationId: number | null;

  /**
   * Location name/address (for quick reference)
   */
  @Column({ name: 'location_name', type: 'varchar', length: 255, nullable: true })
  locationName: string | null;

  /**
   * Capacity (for rooms: number of people, for vehicles: number of seats, etc.)
   */
  @Column({ name: 'capacity', type: 'integer', nullable: true })
  capacity: number | null;

  /**
   * Features/amenities (JSON array: ["projector", "whiteboard", "video-conference"])
   */
  @Column({ name: 'features', type: 'jsonb', nullable: true })
  features: string[] | null;

  /**
   * Hourly rate (if applicable)
   */
  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate: number | null;

  /**
   * Currency for hourly rate
   */
  @Column({ name: 'currency', type: 'varchar', length: 8, nullable: true, default: 'USD' })
  currency: string | null;

  /**
   * Whether resource requires approval for booking
   */
  @Column({ name: 'requires_approval', type: 'boolean', nullable: false, default: false })
  requiresApproval: boolean;

  /**
   * Maximum advance booking days
   */
  @Column({ name: 'max_advance_booking_days', type: 'integer', nullable: true })
  maxAdvanceBookingDays: number | null;

  /**
   * Minimum booking duration in minutes
   */
  @Column({ name: 'min_booking_duration_minutes', type: 'integer', nullable: true })
  minBookingDurationMinutes: number | null;

  /**
   * Maximum booking duration in minutes
   */
  @Column({ name: 'max_booking_duration_minutes', type: 'integer', nullable: true })
  maxBookingDurationMinutes: number | null;

  /**
   * Cancellation policy (hours before booking start)
   */
  @Column({ name: 'cancellation_hours', type: 'integer', nullable: true })
  cancellationHours: number | null;

  /**
   * Maintenance schedule (JSON: { "frequency": "weekly", "day": "sunday", "time": "02:00" })
   */
  @Column({ name: 'maintenance_schedule', type: 'jsonb', nullable: true })
  maintenanceSchedule: Record<string, any> | null;

  /**
   * Next maintenance date
   */
  @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
  nextMaintenanceDate: Date | null;

  /**
   * Availability rules (JSON: { "days": [1,2,3,4,5], "startTime": "09:00", "endTime": "17:00" })
   */
  @Column({ name: 'availability_rules', type: 'jsonb', nullable: true })
  availabilityRules: Record<string, any> | null;

  /**
   * Whether resource is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Resource metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'resource_metadata', type: 'jsonb', nullable: true })
  resourceMetadata: Record<string, any> | null;

  /**
   * Resource bookings
   */
  @OneToMany(() => ResourceBooking, (booking) => booking.resource, {
    cascade: false,
    lazy: true,
  })
  bookings: Promise<ResourceBooking[]> | ResourceBooking[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
