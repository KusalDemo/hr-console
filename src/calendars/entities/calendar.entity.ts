import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CalendarEvent } from './calendar-event.entity';

/**
 * Calendar Type Enum
 */
export enum CalendarType {
  USER = 'USER', // User's personal calendar
  TEAM = 'TEAM', // Team calendar
  ORGANIZATION = 'ORGANIZATION', // Organization calendar
  RESOURCE = 'RESOURCE', // Resource calendar (room, equipment)
  PROJECT = 'PROJECT', // Project calendar
}

/**
 * Calendar Visibility Enum
 */
export enum CalendarVisibility {
  PRIVATE = 'PRIVATE', // Only owner can see
  INTERNAL = 'INTERNAL', // Organization members can see
  PUBLIC = 'PUBLIC', // Everyone can see
  SHARED = 'SHARED', // Shared with specific users/teams
}

/**
 * Calendar Entity
 *
 * Multi-calendar support for users, teams, organizations with visibility rules.
 */
@Entity('calendars')
@Index('idx_calendars_owner', ['ownerId'])
@Index('idx_calendars_type', ['calendarType'])
@Index('idx_calendars_organization', ['organizationId'])
@Index('idx_calendars_active', ['isActive'])
export class Calendar {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Calendar name
   */
  @Column({ name: 'calendar_name', type: 'varchar', length: 255, nullable: false })
  calendarName: string;

  /**
   * Calendar description
   */
  @Column({ name: 'calendar_description', type: 'text', nullable: true })
  calendarDescription: string | null;

  /**
   * Calendar type
   */
  @Column({
    name: 'calendar_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CalendarType.USER,
  })
  calendarType: CalendarType;

  /**
   * Calendar visibility
   */
  @Column({
    name: 'calendar_visibility',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CalendarVisibility.PRIVATE,
  })
  calendarVisibility: CalendarVisibility;

  /**
   * Owner ID (user ID for user calendars, team ID for team calendars, etc.)
   */
  @Column({ name: 'owner_id', type: 'bigint', nullable: false })
  ownerId: number;

  /**
   * Organization ID (for organization-scoped calendars)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Team ID (for team calendars)
   */
  @Column({ name: 'team_id', type: 'bigint', nullable: true })
  teamId: number | null;

  /**
   * Default timezone for calendar
   */
  @Column({ name: 'default_timezone', type: 'varchar', length: 64, nullable: true, default: 'UTC' })
  defaultTimezone: string;

  /**
   * Calendar color (hex color code)
   */
  @Column({ name: 'calendar_color', type: 'varchar', length: 7, nullable: true })
  calendarColor: string | null;

  /**
   * Whether calendar is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether calendar is default for owner
   */
  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  /**
   * Calendar metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'calendar_metadata', type: 'jsonb', nullable: true })
  calendarMetadata: Record<string, any> | null;

  /**
   * Calendar events
   */
  @OneToMany(() => CalendarEvent, (event) => event.calendar, {
    cascade: false,
    lazy: true,
  })
  events: Promise<CalendarEvent[]> | CalendarEvent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
