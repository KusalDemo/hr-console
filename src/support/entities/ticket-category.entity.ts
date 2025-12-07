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
 * Ticket Category Entity
 *
 * Categories for organizing support tickets
 */
@Entity('ticket_categories')
@Index('idx_ticket_categories_organization', ['organizationId'])
@Index('idx_ticket_categories_active', ['isActive'])
export class TicketCategory {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Category name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Category description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Organization this category belongs to (null = global category)
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
   * Default SLA ID for this category
   */
  @Column({ name: 'default_sla_id', type: 'bigint', nullable: true })
  defaultSlaId: number | null;

  /**
   * Default assignee ID for this category
   */
  @Column({ name: 'default_assignee_id', type: 'bigint', nullable: true })
  defaultAssigneeId: number | null;

  /**
   * Display order
   */
  @Column({ name: 'display_order', type: 'integer', nullable: false, default: 0 })
  displayOrder: number;

  /**
   * Whether category is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Icon or image URL
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  icon: string | null;

  /**
   * Tickets in this category
   */
  @OneToMany(() => SupportTicket, (ticket) => ticket.category, {
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
}
