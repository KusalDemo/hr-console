import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';

/**
 * Lead Status Enum
 */
export enum LeadStatus {
  NEW = 'NEW', // New lead
  CONTACTED = 'CONTACTED', // Initial contact made
  QUALIFIED = 'QUALIFIED', // Lead qualified
  PROPOSAL = 'PROPOSAL', // Proposal sent
  NEGOTIATION = 'NEGOTIATION', // In negotiation
  WON = 'WON', // Converted to customer
  LOST = 'LOST', // Lost opportunity
  NURTURING = 'NURTURING', // Being nurtured
  DISQUALIFIED = 'DISQUALIFIED', // Disqualified
}

/**
 * Lead Source Enum
 */
export enum LeadSource {
  WEBSITE = 'WEBSITE', // Website form
  REFERRAL = 'REFERRAL', // Referral
  SOCIAL_MEDIA = 'SOCIAL_MEDIA', // Social media
  EMAIL_CAMPAIGN = 'EMAIL_CAMPAIGN', // Email campaign
  TRADE_SHOW = 'TRADE_SHOW', // Trade show
  PARTNER = 'PARTNER', // Partner
  ADVERTISING = 'ADVERTISING', // Advertising
  DIRECT = 'DIRECT', // Direct contact
  OTHER = 'OTHER', // Other
}

/**
 * Lead Priority Enum
 */
export enum LeadPriority {
  LOW = 'LOW', // Low priority
  MEDIUM = 'MEDIUM', // Medium priority
  HIGH = 'HIGH', // High priority
  URGENT = 'URGENT', // Urgent
}

/**
 * Lead Entity
 * 
 * Lead pipeline and conversion tracking with scoring, source attribution, campaign tracking.
 * Supports lead assignment, routing, conversion to contacts.
 */
@Entity('leads')
@Index('idx_leads_number', ['leadNumber'])
@Index('idx_leads_status', ['leadStatus'])
@Index('idx_leads_source', ['leadSource'])
@Index('idx_leads_priority', ['leadPriority'])
@Index('idx_leads_score', ['leadScore'])
@Index('idx_leads_assigned', ['assignedTo'])
@Index('idx_leads_organization', ['organizationId'])
@Index('idx_leads_campaign', ['campaignId'])
@Index('idx_leads_converted', ['isConverted'])
@Index('idx_leads_archived', ['isArchived'])
@Index('idx_leads_active', ['isActive'])
export class Lead {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique lead number (auto-generated or manual)
   */
  @Column({ name: 'lead_number', type: 'varchar', length: 64, unique: true, nullable: true })
  leadNumber: string | null;

  /**
   * First name
   */
  @Column({ name: 'first_name', type: 'varchar', length: 128, nullable: true })
  firstName: string | null;

  /**
   * Last name
   */
  @Column({ name: 'last_name', type: 'varchar', length: 128, nullable: true })
  lastName: string | null;

  /**
   * Full name (computed or provided)
   */
  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: false })
  fullName: string;

  /**
   * Display name
   */
  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  /**
   * Company name
   */
  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName: string | null;

  /**
   * Job title
   */
  @Column({ name: 'job_title', type: 'varchar', length: 128, nullable: true })
  jobTitle: string | null;

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
   * Lead status
   */
  @Column({
    name: 'lead_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: LeadStatus.NEW,
  })
  leadStatus: LeadStatus;

  /**
   * Lead source
   */
  @Column({
    name: 'lead_source',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: LeadSource.OTHER,
  })
  leadSource: LeadSource;

  /**
   * Lead priority
   */
  @Column({
    name: 'lead_priority',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: LeadPriority.MEDIUM,
  })
  leadPriority: LeadPriority;

  /**
   * Lead score (automated or manual)
   */
  @Column({ name: 'lead_score', type: 'integer', nullable: false, default: 0 })
  leadScore: number;

  /**
   * Last score calculation date
   */
  @Column({ name: 'last_score_calculation', type: 'timestamptz', nullable: true })
  lastScoreCalculation: Date | null;

  /**
   * Assigned to (employee/user ID)
   */
  @Column({ name: 'assigned_to', type: 'bigint', nullable: true })
  assignedTo: number | null;

  /**
   * Organization ID (for organization-scoped leads)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Campaign ID (for campaign tracking)
   */
  @Column({ name: 'campaign_id', type: 'bigint', nullable: true })
  campaignId: number | null;

  /**
   * Campaign name (for quick reference)
   */
  @Column({ name: 'campaign_name', type: 'varchar', length: 255, nullable: true })
  campaignName: string | null;

  /**
   * Industry
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  industry: string | null;

  /**
   * Company size
   */
  @Column({ name: 'company_size', type: 'varchar', length: 32, nullable: true })
  companySize: string | null;

  /**
   * Estimated value/opportunity amount
   */
  @Column({ name: 'estimated_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedValue: number | null;

  /**
   * Currency code for estimated value
   */
  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true, default: 'USD' })
  currencyCode: string | null;

  /**
   * Expected close date
   */
  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate: Date | null;

  /**
   * Actual close date
   */
  @Column({ name: 'actual_close_date', type: 'date', nullable: true })
  actualCloseDate: Date | null;

  /**
   * Conversion date (when converted to contact)
   */
  @Column({ name: 'conversion_date', type: 'timestamptz', nullable: true })
  conversionDate: Date | null;

  /**
   * Converted contact ID (if converted)
   */
  @Column({ name: 'converted_contact_id', type: 'bigint', nullable: true })
  convertedContactId: number | null;

  /**
   * Converted contact relationship
   */
  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'converted_contact_id' })
  convertedContact: Contact | null;

  /**
   * Conversion reason
   */
  @Column({ name: 'conversion_reason', type: 'varchar', length: 255, nullable: true })
  conversionReason: string | null;

  /**
   * Loss reason (if lost)
   */
  @Column({ name: 'loss_reason', type: 'varchar', length: 255, nullable: true })
  lossReason: string | null;

  /**
   * Rejection reason (if disqualified)
   */
  @Column({ name: 'rejection_reason', type: 'varchar', length: 255, nullable: true })
  rejectionReason: string | null;

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
   * Next follow-up date
   */
  @Column({ name: 'next_follow_up_date', type: 'date', nullable: true })
  nextFollowUpDate: Date | null;

  /**
   * Lead metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'lead_metadata', type: 'jsonb', nullable: true })
  leadMetadata: Record<string, any> | null;

  /**
   * Whether lead is converted
   */
  @Column({ name: 'is_converted', type: 'boolean', nullable: false, default: false })
  isConverted: boolean;

  /**
   * Whether lead is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether lead is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * When lead was archived
   */
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /**
   * User who archived the lead
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
   * Check if lead is currently active
   */
  isCurrentlyActive(): boolean {
    return (
      this.isActive &&
      !this.isArchived &&
      !this.isConverted &&
      this.leadStatus !== LeadStatus.LOST &&
      this.leadStatus !== LeadStatus.DISQUALIFIED
    );
  }

  /**
   * Get display name
   */
  getDisplayName(): string {
    return this.displayName || this.fullName;
  }

  /**
   * Check if lead can be converted
   */
  canBeConverted(): boolean {
    return (
      !this.isConverted &&
      this.isActive &&
      !this.isArchived &&
      (this.leadStatus === LeadStatus.QUALIFIED ||
        this.leadStatus === LeadStatus.PROPOSAL ||
        this.leadStatus === LeadStatus.NEGOTIATION ||
        this.leadStatus === LeadStatus.WON)
    );
  }
}

