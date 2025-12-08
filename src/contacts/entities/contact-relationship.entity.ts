import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Contact } from './contact.entity';

/**
 * Relationship Type Enum
 */
export enum RelationshipType {
  PARENT_COMPANY = 'PARENT_COMPANY', // Parent company
  SUBSIDIARY = 'SUBSIDIARY', // Subsidiary
  PARTNER = 'PARTNER', // Partner
  COMPETITOR = 'COMPETITOR', // Competitor
  RELATED = 'RELATED', // Related company
  SAME_COMPANY = 'SAME_COMPANY', // Same company (different location/division)
}

/**
 * Relationship Direction Enum
 */
export enum RelationshipDirection {
  UNIDIRECTIONAL = 'UNIDIRECTIONAL', // One-way relationship
  BIDIRECTIONAL = 'BIDIRECTIONAL', // Two-way relationship
}

/**
 * Relationship Strength Enum
 */
export enum RelationshipStrength {
  STRONG = 'STRONG', // Strong relationship
  MODERATE = 'MODERATE', // Moderate relationship
  WEAK = 'WEAK', // Weak relationship
}

/**
 * Contact Relationship Entity
 *
 * Represents relationships between contacts (hierarchical and other).
 * Supports parent company, subsidiaries, partners, competitors, etc.
 */
@Entity('contact_relationships')
@Index('idx_contact_relationships_contact', ['contactId'])
@Index('idx_contact_relationships_related', ['relatedContactId'])
@Index('idx_contact_relationships_type', ['relationshipType'])
@Index('idx_contact_relationships_active', ['isActive'])
@Check(`contact_id != related_contact_id`)
export class ContactRelationship {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Contact this relationship belongs to
   */
  @ManyToOne(() => Contact, (contact) => contact.relationships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'contact_id', type: 'bigint', nullable: false })
  contactId: number;

  /**
   * Related contact
   */
  @ManyToOne(() => Contact, (contact) => contact.inverseRelationships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'related_contact_id' })
  relatedContact: Contact;

  @Column({ name: 'related_contact_id', type: 'bigint', nullable: false })
  relatedContactId: number;

  /**
   * Relationship type
   */
  @Column({
    name: 'relationship_type',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  relationshipType: RelationshipType;

  /**
   * Relationship direction
   */
  @Column({
    name: 'relationship_direction',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: RelationshipDirection.BIDIRECTIONAL,
  })
  relationshipDirection: RelationshipDirection;

  /**
   * Relationship strength
   */
  @Column({
    name: 'relationship_strength',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  relationshipStrength: RelationshipStrength | null;

  /**
   * Description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Relationship start date
   */
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  /**
   * Relationship end date
   */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  /**
   * Whether relationship is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if relationship is currently active
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();

    if (this.startDate && new Date(this.startDate) > now) {
      return false;
    }

    if (this.endDate && new Date(this.endDate) < now) {
      return false;
    }

    return true;
  }
}


