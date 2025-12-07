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
 * Comment Type Enum
 */
export enum CommentType {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  SYSTEM = 'SYSTEM',
}

/**
 * Ticket Comment Entity
 * 
 * Comments on support tickets
 */
@Entity('ticket_comments')
@Index('idx_ticket_comments_ticket', ['ticketId'])
@Index('idx_ticket_comments_author', ['authorId'])
@Index('idx_ticket_comments_created', ['createdAt'])
export class TicketComment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Ticket this comment belongs to
   */
  @ManyToOne(() => SupportTicket, (ticket) => ticket.comments, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Promise<SupportTicket> | SupportTicket;

  @Column({ name: 'ticket_id', type: 'bigint', nullable: false })
  ticketId: number;

  /**
   * Comment author
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'author_id' })
  author: Promise<Employee | null> | Employee | null;

  @Column({ name: 'author_id', type: 'bigint', nullable: true })
  authorId: number | null;

  /**
   * Comment content
   */
  @Column({ type: 'text', nullable: false })
  content: string;

  /**
   * Comment type
   */
  @Column({
    name: 'comment_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CommentType.PUBLIC,
  })
  commentType: CommentType;

  /**
   * Whether comment is from customer
   */
  @Column({ name: 'is_customer_comment', type: 'boolean', nullable: false, default: false })
  isCustomerComment: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}
