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
import { Employee } from '../../employees/entities/employee.entity';
import { TicketCategory } from './ticket-category.entity';
import { TicketSLA } from './ticket-sla.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketTimeEntry } from './ticket-time-entry.entity';

/**
 * Ticket Status Enum
 */
export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Ticket Priority Enum
 */
export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

/**
 * Support Ticket Entity
 * 
 * Manages support tickets with:
 * - Ticket lifecycle (open, assigned, in-progress, resolved, closed)
 * - SLA tracking
 * - Assignment and escalation
 * - Time tracking
 * - Comments and attachments
 */
@Entity('support_tickets')
@Index('idx_support_tickets_status', ['status'])
@Index('idx_support_tickets_priority', ['priority'])
@Index('idx_support_tickets_category', ['categoryId'])
@Index('idx_support_tickets_organization', ['organizationId'])
@Index('idx_support_tickets_assignee', ['assignedToId'])
@Index('idx_support_tickets_requester', ['requesterId'])
@Index('idx_support_tickets_created', ['createdAt'])
@Index('idx_support_tickets_ticket_number', ['ticketNumber'], { unique: true })
export class SupportTicket {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique ticket number (e.g., TKT-2024-001)
   */
  @Column({ name: 'ticket_number', type: 'varchar', length: 128, unique: true, nullable: false })
  ticketNumber: string;

  /**
   * Ticket subject/title
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  subject: string;

  /**
   * Ticket description
   */
  @Column({ type: 'text', nullable: false })
  description: string;

  /**
   * Ticket status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  /**
   * Ticket priority
   */
  @Column({
    name: 'priority',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  /**
   * Category this ticket belongs to
   */
  @ManyToOne(() => TicketCategory, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: Promise<TicketCategory | null> | TicketCategory | null;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId: number | null;

  /**
   * Organization this ticket belongs to
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Requester (employee who created the ticket)
   */
  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'requester_id' })
  requester: Promise<Employee> | Employee;

  @Column({ name: 'requester_id', type: 'bigint', nullable: false })
  requesterId: number;

  /**
   * Assigned to (employee assigned to handle the ticket)
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: Promise<Employee | null> | Employee | null;

  @Column({ name: 'assigned_to_id', type: 'bigint', nullable: true })
  assignedToId: number | null;

  /**
   * SLA this ticket is subject to
   */
  @ManyToOne(() => TicketSLA, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'sla_id' })
  sla: Promise<TicketSLA | null> | TicketSLA | null;

  @Column({ name: 'sla_id', type: 'bigint', nullable: true })
  slaId: number | null;

  /**
   * Ticket comments
   */
  @OneToMany(() => TicketComment, (comment) => comment.ticket, {
    cascade: false,
    lazy: true,
  })
  comments: Promise<TicketComment[]> | TicketComment[];

  /**
   * Ticket attachments
   */
  @OneToMany(() => TicketAttachment, (attachment) => attachment.ticket, {
    cascade: false,
    lazy: true,
  })
  attachments: Promise<TicketAttachment[]> | TicketAttachment[];

  /**
   * Time entries for this ticket
   */
  @OneToMany(() => TicketTimeEntry, (timeEntry) => timeEntry.ticket, {
    cascade: false,
    lazy: true,
  })
  timeEntries: Promise<TicketTimeEntry[]> | TicketTimeEntry[];

  /**
   * First response due at (SLA)
   */
  @Column({ name: 'first_response_due_at', type: 'timestamptz', nullable: true })
  firstResponseDueAt: Date | null;

  /**
   * First response at
   */
  @Column({ name: 'first_response_at', type: 'timestamptz', nullable: true })
  firstResponseAt: Date | null;

  /**
   * Resolution due at (SLA)
   */
  @Column({ name: 'resolution_due_at', type: 'timestamptz', nullable: true })
  resolutionDueAt: Date | null;

  /**
   * Resolved at
   */
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  /**
   * Closed at
   */
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  /**
   * Total time spent in minutes
   */
  @Column({ name: 'total_time_minutes', type: 'integer', nullable: false, default: 0 })
  totalTimeMinutes: number;

  /**
   * Tags (JSON array)
   */
  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  /**
   * Custom fields (JSON)
   */
  @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
  customFields: Record<string, any> | null;

  /**
   * Customer satisfaction rating (1-5)
   */
  @Column({ name: 'satisfaction_rating', type: 'integer', nullable: true })
  satisfactionRating: number | null;

  /**
   * Customer satisfaction feedback
   */
  @Column({ name: 'satisfaction_feedback', type: 'text', nullable: true })
  satisfactionFeedback: string | null;

  /**
   * Whether ticket is escalated
   */
  @Column({ name: 'is_escalated', type: 'boolean', nullable: false, default: false })
  isEscalated: boolean;

  /**
   * Escalation reason
   */
  @Column({ name: 'escalation_reason', type: 'text', nullable: true })
  escalationReason: string | null;

  /**
   * Escalated at
   */
  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt: Date | null;

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
   * Check if ticket is open
   */
  isOpen(): boolean {
    return [
      TicketStatus.OPEN,
      TicketStatus.ASSIGNED,
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_CUSTOMER,
    ].includes(this.status);
  }

  /**
   * Check if ticket is closed
   */
  isClosed(): boolean {
    return [
      TicketStatus.CLOSED,
      TicketStatus.CANCELLED,
      TicketStatus.RESOLVED,
    ].includes(this.status);
  }

  /**
   * Check if first response is overdue
   */
  isFirstResponseOverdue(): boolean {
    if (!this.firstResponseDueAt) {
      return false;
    }
    return new Date() > this.firstResponseDueAt && !this.firstResponseAt;
  }

  /**
   * Check if resolution is overdue
   */
  isResolutionOverdue(): boolean {
    if (!this.resolutionDueAt) {
      return false;
    }
    return new Date() > this.resolutionDueAt && !this.resolvedAt;
  }
}
