import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ContactRelationship } from './contact-relationship.entity';
import { ContactInteraction } from './contact-interaction.entity';

/**
 * Contact Type Enum
 */
export enum ContactType {
  PERSON = 'PERSON', // Individual person
  COMPANY = 'COMPANY', // Company/organization
}

/**
 * Contact Category Enum
 */
export enum ContactCategory {
  CLIENT = 'CLIENT', // Client
  CUSTOMER = 'CUSTOMER', // Customer
  VENDOR = 'VENDOR', // Vendor
  LEAD = 'LEAD', // Lead
  PARTNER = 'PARTNER', // Partner
  SUPPLIER = 'SUPPLIER', // Supplier
  OTHER = 'OTHER', // Other
}

/**
 * Contact Status Enum
 */
export enum ContactStatus {
  ACTIVE = 'ACTIVE', // Active
  INACTIVE = 'INACTIVE', // Inactive
  ARCHIVED = 'ARCHIVED', // Archived
  BLACKLISTED = 'BLACKLISTED', // Blacklisted
}

/**
 * Company Size Enum
 */
export enum CompanySize {
  SOLO = 'SOLO', // Solo
  SMALL = 'SMALL', // Small (1-10)
  MEDIUM = 'MEDIUM', // Medium (11-50)
  LARGE = 'LARGE', // Large (51-200)
  ENTERPRISE = 'ENTERPRISE', // Enterprise (200+)
}

/**
 * Contact Entity
 *
 * Unified contact management for clients, customers, vendors, leads.
 * Supports contact types, relationships, segmentation, tags, custom fields integration.
 */
@Entity('contacts')
@Index('idx_contacts_key', ['contactKey'])
@Index('idx_contacts_number', ['contactNumber'])
@Index('idx_contacts_type', ['contactType'])
@Index('idx_contacts_category', ['contactCategory'])
@Index('idx_contacts_status', ['contactStatus'])
@Index('idx_contacts_email', ['email'])
@Index('idx_contacts_organization', ['organizationId'])
@Index('idx_contacts_archived', ['isArchived'])
@Index('idx_contacts_active', ['isActive'])
export class Contact {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique contact key (optional)
   */
  @Column({ name: 'contact_key', type: 'varchar', length: 128, unique: true, nullable: true })
  contactKey: string | null;

  /**
   * Contact number (auto-generated or manual)
   */
  @Column({ name: 'contact_number', type: 'varchar', length: 64, nullable: true })
  contactNumber: string | null;

  /**
   * First name (for person contacts)
   */
  @Column({ name: 'first_name', type: 'varchar', length: 128, nullable: true })
  firstName: string | null;

  /**
   * Last name (for person contacts)
   */
  @Column({ name: 'last_name', type: 'varchar', length: 128, nullable: true })
  lastName: string | null;

  /**
   * Full name (computed or provided)
   */
  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: false })
  fullName: string;

  /**
   * Display name (may differ from full name)
   */
  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  /**
   * Company name (for company contacts or person's company)
   */
  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName: string | null;

  /**
   * Contact type
   */
  @Column({
    name: 'contact_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ContactType.PERSON,
  })
  contactType: ContactType;

  /**
   * Contact category
   */
  @Column({
    name: 'contact_category',
    type: 'varchar',
    length: 64,
    nullable: false,
    default: ContactCategory.OTHER,
  })
  contactCategory: ContactCategory;

  /**
   * Contact status
   */
  @Column({
    name: 'contact_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ContactStatus.ACTIVE,
  })
  contactStatus: ContactStatus;

  /**
   * Contact source
   */
  @Column({ name: 'contact_source', type: 'varchar', length: 128, nullable: true })
  contactSource: string | null;

  /**
   * Primary email
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  /**
   * Secondary email
   */
  @Column({ name: 'email_secondary', type: 'varchar', length: 255, nullable: true })
  emailSecondary: string | null;

  /**
   * Phone
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  /**
   * Mobile phone
   */
  @Column({ name: 'phone_mobile', type: 'varchar', length: 32, nullable: true })
  phoneMobile: string | null;

  /**
   * Work phone
   */
  @Column({ name: 'phone_work', type: 'varchar', length: 32, nullable: true })
  phoneWork: string | null;

  /**
   * Fax
   */
  @Column({ name: 'phone_fax', type: 'varchar', length: 32, nullable: true })
  phoneFax: string | null;

  /**
   * Website
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  /**
   * Address line 1
   */
  @Column({ name: 'address_line1', type: 'varchar', length: 255, nullable: true })
  addressLine1: string | null;

  /**
   * Address line 2
   */
  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  /**
   * City
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  /**
   * State/Province
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  state: string | null;

  /**
   * Postal code
   */
  @Column({ name: 'postal_code', type: 'varchar', length: 32, nullable: true })
  postalCode: string | null;

  /**
   * Country
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  country: string | null;

  /**
   * Address type
   */
  @Column({ name: 'address_type', type: 'varchar', length: 32, nullable: true })
  addressType: string | null; // BILLING, SHIPPING, HEADQUARTERS, BRANCH

  /**
   * Organization ID (for organization-scoped contacts)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Company size (for company contacts)
   */
  @Column({
    name: 'company_size',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  companySize: CompanySize | null;

  /**
   * Industry
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  industry: string | null;

  /**
   * Tags (comma-separated or JSON array)
   */
  @Column({ type: 'text', nullable: true })
  tags: string | null;

  /**
   * Notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Last contact date
   */
  @Column({ name: 'last_contact_date', type: 'date', nullable: true })
  lastContactDate: Date | null;

  /**
   * Last activity date
   */
  @Column({ name: 'last_activity_date', type: 'timestamptz', nullable: true })
  lastActivityDate: Date | null;

  /**
   * Next follow-up date
   */
  @Column({ name: 'next_follow_up_date', type: 'date', nullable: true })
  nextFollowUpDate: Date | null;

  /**
   * Contact metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'contact_metadata', type: 'jsonb', nullable: true })
  contactMetadata: Record<string, any> | null;

  /**
   * Contact relationships (outgoing)
   */
  @OneToMany(() => ContactRelationship, (relationship) => relationship.contact, {
    cascade: true,
    lazy: true,
  })
  relationships: Promise<ContactRelationship[]> | ContactRelationship[];

  /**
   * Contact relationships (incoming)
   */
  @OneToMany(() => ContactRelationship, (relationship) => relationship.relatedContact, {
    cascade: false,
    lazy: true,
  })
  inverseRelationships: Promise<ContactRelationship[]> | ContactRelationship[];

  /**
   * Contact interactions
   */
  @OneToMany(() => ContactInteraction, (interaction) => interaction.contact, {
    cascade: true,
    lazy: true,
  })
  interactions: Promise<ContactInteraction[]> | ContactInteraction[];

  /**
   * Whether contact is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether contact is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * When contact was archived
   */
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /**
   * User who archived the contact
   */
  @Column({ name: 'archived_by', type: 'bigint', nullable: true })
  archivedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if contact is active
   */
  isCurrentlyActive(): boolean {
    return this.isActive && !this.isArchived && this.contactStatus === ContactStatus.ACTIVE;
  }

  /**
   * Get display name
   */
  getDisplayName(): string {
    return this.displayName || this.fullName;
  }
}


