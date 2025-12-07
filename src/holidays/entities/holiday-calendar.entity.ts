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
import { Organization } from '../../organizations/entities/organization.entity';
import { Holiday } from './holiday.entity';
import { EmployeeHolidayCalendarAssignment } from './employee-holiday-calendar-assignment.entity';

/**
 * Calendar Type Enum
 */
export enum CalendarType {
  COUNTRY = 'COUNTRY',     // Country-wide calendar
  REGION = 'REGION',       // State/province-specific calendar
  COMPANY = 'COMPANY',     // Company-specific calendar
  CUSTOM = 'CUSTOM',       // Custom calendar
}

/**
 * Holiday Calendar Entity
 * 
 * Country/region-specific holiday calendars with:
 * - Multi-region support
 * - Calendar assignment to employees/organizations
 * - Floating holidays support
 * - Company-specific holidays
 * - Observance rules
 */
@Entity('holiday_calendars')
@Index('idx_holiday_calendars_key', ['calendarKey'])
@Index('idx_holiday_calendars_country', ['countryCode'])
@Index('idx_holiday_calendars_region', ['regionCode'])
@Index('idx_holiday_calendars_active', ['isActive'])
@Index('idx_holiday_calendars_organization', ['organizationId'])
export class HolidayCalendar {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique calendar identifier
   */
  @Column({ name: 'calendar_key', type: 'varchar', length: 128, unique: true, nullable: false })
  calendarKey: string;

  /**
   * Calendar name (e.g., "US Federal Holidays", "UK Bank Holidays")
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Calendar description
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string | null;

  /**
   * ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "IN")
   */
  @Column({ name: 'country_code', type: 'varchar', length: 8, nullable: true })
  countryCode: string | null;

  /**
   * Country name
   */
  @Column({ name: 'country_name', type: 'varchar', length: 128, nullable: true })
  countryName: string | null;

  /**
   * State/province code (e.g., "CA", "NY", "TX")
   */
  @Column({ name: 'region_code', type: 'varchar', length: 32, nullable: true })
  regionCode: string | null;

  /**
   * State/province name
   */
  @Column({ name: 'region_name', type: 'varchar', length: 128, nullable: true })
  regionName: string | null;

  /**
   * IANA timezone for this calendar
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone: string | null;

  /**
   * Calendar type
   */
  @Column({
    name: 'calendar_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CalendarType.COUNTRY,
  })
  calendarType: CalendarType;

  /**
   * Organization ID (for company-specific calendars)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Organization relationship
   */
  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  /**
   * Whether this is a company-specific calendar
   */
  @Column({ name: 'is_company_specific', type: 'boolean', nullable: false, default: false })
  isCompanySpecific: boolean;

  /**
   * Default calendar for country/region
   */
  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  /**
   * Whether floating holidays are supported
   */
  @Column({ name: 'supports_floating_holidays', type: 'boolean', nullable: false, default: false })
  supportsFloatingHolidays: boolean;

  /**
   * Observance rules (JSONB)
   * Example: {
   *   "moveToWeekday": true,
   *   "moveToMonday": true,
   *   "moveToFriday": false,
   *   "observeOnWeekend": false
   * }
   */
  @Column({ name: 'observance_rules', type: 'jsonb', nullable: true })
  observanceRules: Record<string, any> | null;

  /**
   * Whether calendar is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether calendar is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * Calendar metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'calendar_metadata', type: 'jsonb', nullable: true })
  calendarMetadata: Record<string, any> | null;

  /**
   * Holidays in this calendar
   */
  @OneToMany(() => Holiday, (holiday) => holiday.holidayCalendar, {
    cascade: false,
    lazy: true,
  })
  holidays: Promise<Holiday[]> | Holiday[];

  /**
   * Employee assignments
   */
  @OneToMany(
    () => EmployeeHolidayCalendarAssignment,
    (assignment) => assignment.holidayCalendar,
    {
      cascade: false,
      lazy: true,
    },
  )
  employeeAssignments: Promise<EmployeeHolidayCalendarAssignment[]> | EmployeeHolidayCalendarAssignment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
