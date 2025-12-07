import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SupportTicket } from './support-ticket.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Ticket Time Entry Entity
 * 
 * Time tracking for support tickets
 */
@Entity('ticket_time_entries')
@Index('idx_ticket_time_entries_ticket', ['ticketId'])
@Index('idx_ticket_time_entries_employee', ['employeeId'])
@Index('idx_ticket_time_entries_date', ['date'])
export class TicketTimeEntry {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Ticket this time entry belongs to
   */
  @ManyToOne(() => SupportTicket, (ticket) => ticket.timeEntries, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Promise<SupportTicket> | SupportTicket;

  @Column({ name: 'ticket_id', type: 'bigint', nullable: false })
  ticketId: number;

  /**
   * Employee who logged the time
   */
  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Promise<Employee> | Employee;

  @Column({ name: 'employee_id', type: 'bigint', nullable: false })
  employeeId: number;

  /**
   * Date of time entry
   */
  @Column({ type: 'date', nullable: false })
  date: Date;

  /**
   * Time spent in minutes
   */
  @Column({ name: 'time_minutes', type: 'integer', nullable: false })
  timeMinutes: number;

  /**
   * Description of work done
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Whether time is billable
   */
  @Column({ name: 'is_billable', type: 'boolean', nullable: false, default: false })
  isBillable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;
}
