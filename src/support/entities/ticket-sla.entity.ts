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
import { SupportTicket } from './support-ticket.entity';

/**
 * SLA Response Time Unit Enum
 */
export enum SLATimeUnit {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
}

/**
 * Ticket SLA Entity
 *
 * Defines Service Level Agreements for tickets:
 * - First response time
 * - Resolution time
 * - Business hours
 * - Escalation rules
 */
@Entity('ticket_slas')
@Index('idx_ticket_slas_organization', ['organizationId'])
@Index('idx_ticket_slas_active', ['isActive'])
export class TicketSLA {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * SLA name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * SLA description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Organization this SLA belongs to (null = global SLA)
   */
  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization | null> | Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * First response time (in time unit)
   */
  @Column({ name: 'first_response_time', type: 'integer', nullable: false })
  firstResponseTime: number;

  /**
   * First response time unit
   */
  @Column({
    name: 'first_response_time_unit',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: SLATimeUnit.HOURS,
  })
  firstResponseTimeUnit: SLATimeUnit;

  /**
   * Resolution time (in time unit)
   */
  @Column({ name: 'resolution_time', type: 'integer', nullable: false })
  resolutionTime: number;

  /**
   * Resolution time unit
   */
  @Column({
    name: 'resolution_time_unit',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: SLATimeUnit.HOURS,
  })
  resolutionTimeUnit: SLATimeUnit;

  /**
   * Business hours configuration (JSON)
   * Example: { start: "09:00", end: "17:00", timezone: "UTC", days: [1,2,3,4,5] }
   */
  @Column({ name: 'business_hours', type: 'jsonb', nullable: true })
  businessHours: Record<string, any> | null;

  /**
   * Whether SLA applies only during business hours
   */
  @Column({ name: 'business_hours_only', type: 'boolean', nullable: false, default: false })
  businessHoursOnly: boolean;

  /**
   * Priority-based SLA overrides (JSON)
   * Example: { "URGENT": { firstResponseTime: 30, resolutionTime: 240 } }
   */
  @Column({ name: 'priority_overrides', type: 'jsonb', nullable: true })
  priorityOverrides: Record<string, any> | null;

  /**
   * Escalation rules (JSON)
   * Example: { "firstResponseOverdue": { escalateTo: "manager", notify: true } }
   */
  @Column({ name: 'escalation_rules', type: 'jsonb', nullable: true })
  escalationRules: Record<string, any> | null;

  /**
   * Whether SLA is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether this is the default SLA
   */
  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  /**
   * Tickets using this SLA
   */
  @OneToMany(() => SupportTicket, (ticket) => ticket.sla, {
    cascade: false,
    lazy: true,
  })
  tickets: Promise<SupportTicket[]> | SupportTicket[];

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Calculate first response due date
   */
  calculateFirstResponseDueDate(startDate: Date): Date {
    const timeInMs = this.convertTimeToMilliseconds(
      this.firstResponseTime,
      this.firstResponseTimeUnit,
    );
    return new Date(startDate.getTime() + timeInMs);
  }

  /**
   * Calculate resolution due date
   */
  calculateResolutionDueDate(startDate: Date): Date {
    const timeInMs = this.convertTimeToMilliseconds(this.resolutionTime, this.resolutionTimeUnit);
    return new Date(startDate.getTime() + timeInMs);
  }

  /**
   * Convert time to milliseconds
   */
  private convertTimeToMilliseconds(time: number, unit: SLATimeUnit): number {
    switch (unit) {
      case SLATimeUnit.MINUTES:
        return time * 60 * 1000;
      case SLATimeUnit.HOURS:
        return time * 60 * 60 * 1000;
      case SLATimeUnit.DAYS:
        return time * 24 * 60 * 60 * 1000;
      default:
        return time * 60 * 60 * 1000; // Default to hours
    }
  }
}
