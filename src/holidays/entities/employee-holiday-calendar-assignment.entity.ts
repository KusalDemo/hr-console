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
import { HolidayCalendar } from './holiday-calendar.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Employee Holiday Calendar Assignment Entity
 * 
 * Links employees to holiday calendars with:
 * - Calendar assignment to employees
 * - Effective date ranges
 * - Assignment metadata
 */
@Entity('employee_holiday_calendar_assignments')
@Index('idx_employee_holiday_calendar_assignments_employee', ['employeeId'])
@Index('idx_employee_holiday_calendar_assignments_calendar', ['holidayCalendarId'])
@Index('idx_employee_holiday_calendar_assignments_active', ['employeeId', 'isActive'])
@Index('idx_employee_holiday_calendar_assignments_effective', ['effectiveStartDate', 'effectiveEndDate'])
export class EmployeeHolidayCalendarAssignment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to employee
   */
  @Column({ name: 'employee_id', type: 'bigint', nullable: false })
  employeeId: number;

  /**
   * Employee relationship
   */
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  /**
   * Reference to holiday calendar
   */
  @Column({ name: 'holiday_calendar_id', type: 'bigint', nullable: false })
  holidayCalendarId: number;

  /**
   * Holiday calendar relationship
   */
  @ManyToOne(() => HolidayCalendar, (calendar) => calendar.employeeAssignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'holiday_calendar_id' })
  holidayCalendar: HolidayCalendar;

  /**
   * Effective start date for this assignment
   */
  @Column({ name: 'effective_start_date', type: 'date', nullable: false })
  effectiveStartDate: Date;

  /**
   * Effective end date (null means no end date)
   */
  @Column({ name: 'effective_end_date', type: 'date', nullable: true })
  effectiveEndDate: Date | null;

  /**
   * Whether this assignment is currently active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Assignment notes
   */
  @Column({ name: 'assignment_notes', type: 'text', nullable: true })
  assignmentNotes: string | null;

  /**
   * Assignment metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'assignment_metadata', type: 'jsonb', nullable: true })
  assignmentMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if assignment is currently active
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();
    const startDate = new Date(this.effectiveStartDate);

    if (now < startDate) {
      return false;
    }

    if (this.effectiveEndDate) {
      const endDate = new Date(this.effectiveEndDate);
      if (now > endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if assignment is effective on a given date
   */
  isEffectiveOn(date: Date): boolean {
    if (!this.isActive) {
      return false;
    }

    const checkDate = new Date(date);
    const startDate = new Date(this.effectiveStartDate);

    if (checkDate < startDate) {
      return false;
    }

    if (this.effectiveEndDate) {
      const endDate = new Date(this.effectiveEndDate);
      if (checkDate > endDate) {
        return false;
      }
    }

    return true;
  }
}
