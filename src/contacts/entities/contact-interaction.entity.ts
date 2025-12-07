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
import { Contact } from './contact.entity';

/**
 * Interaction Type Enum
 */
export enum InteractionType {
  EMAIL = 'EMAIL', // Email
  PHONE = 'PHONE', // Phone call
  MEETING = 'MEETING', // Meeting
  NOTE = 'NOTE', // Note
  TASK = 'TASK', // Task
  DEAL = 'DEAL', // Deal/Opportunity
  SUPPORT = 'SUPPORT', // Support ticket
  OTHER = 'OTHER', // Other
}

/**
 * Interaction Direction Enum
 */
export enum InteractionDirection {
  INBOUND = 'INBOUND', // Incoming
  OUTBOUND = 'OUTBOUND', // Outgoing
}

/**
 * Contact Interaction Entity
 * 
 * Tracks interaction history and activity timeline for contacts.
 * Supports various interaction types (email, phone, meeting, etc.)
 */
@Entity('contact_interactions')
@Index('idx_contact_interactions_contact', ['contactId'])
@Index('idx_contact_interactions_type', ['interactionType'])
@Index('idx_contact_interactions_date', ['interactionDate'])
@Index('idx_contact_interactions_direction', ['direction'])
export class ContactInteraction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Contact this interaction belongs to
   */
  @ManyToOne(() => Contact, (contact) => contact.interactions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'contact_id', type: 'bigint', nullable: false })
  contactId: number;

  /**
   * Interaction type
   */
  @Column({
    name: 'interaction_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: InteractionType.OTHER,
  })
  interactionType: InteractionType;

  /**
   * Interaction direction
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: InteractionDirection.OUTBOUND,
  })
  direction: InteractionDirection;

  /**
   * Interaction subject/title
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  subject: string;

  /**
   * Interaction description/notes
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Interaction date
   */
  @Column({ name: 'interaction_date', type: 'timestamptz', nullable: false })
  interactionDate: Date;

  /**
   * Duration in minutes (for calls, meetings)
   */
  @Column({ type: 'integer', nullable: true })
  duration: number | null;

  /**
   * Employee ID (who had the interaction)
   */
  @Column({ name: 'employee_id', type: 'bigint', nullable: true })
  employeeId: number | null;

  /**
   * Related entity ID (task, deal, support ticket, etc.)
   */
  @Column({ name: 'related_entity_id', type: 'bigint', nullable: true })
  relatedEntityId: number | null;

  /**
   * Related entity type
   */
  @Column({ name: 'related_entity_type', type: 'varchar', length: 64, nullable: true })
  relatedEntityType: string | null;

  /**
   * Outcome/result
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  outcome: string | null;

  /**
   * Next action/follow-up
   */
  @Column({ name: 'next_action', type: 'text', nullable: true })
  nextAction: string | null;

  /**
   * Next follow-up date
   */
  @Column({ name: 'next_follow_up_date', type: 'date', nullable: true })
  nextFollowUpDate: Date | null;

  /**
   * Interaction metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'interaction_metadata', type: 'jsonb', nullable: true })
  interactionMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}


