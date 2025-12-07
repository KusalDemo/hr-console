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

/**
 * Ticket Attachment Entity
 *
 * File attachments for support tickets
 */
@Entity('ticket_attachments')
@Index('idx_ticket_attachments_ticket', ['ticketId'])
export class TicketAttachment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Ticket this attachment belongs to
   */
  @ManyToOne(() => SupportTicket, (ticket) => ticket.attachments, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Promise<SupportTicket> | SupportTicket;

  @Column({ name: 'ticket_id', type: 'bigint', nullable: false })
  ticketId: number;

  /**
   * Attachment name
   */
  @Column({ name: 'attachment_name', type: 'varchar', length: 255, nullable: false })
  attachmentName: string;

  /**
   * Attachment type (MIME type)
   */
  @Column({ name: 'attachment_type', type: 'varchar', length: 64, nullable: true })
  attachmentType: string | null;

  /**
   * File path/URL
   */
  @Column({ name: 'file_path', type: 'varchar', length: 512, nullable: false })
  filePath: string;

  /**
   * File size in bytes
   */
  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz', nullable: false })
  uploadedAt: Date;

  @Column({ name: 'uploaded_by', type: 'bigint', nullable: true })
  uploadedBy: number | null;
}
