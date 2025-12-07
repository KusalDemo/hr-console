import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { Project } from '../../projects/entities/project.entity';

/**
 * Client Status Enum
 */
export enum ClientStatus {
  ACTIVE = 'ACTIVE', // Active client
  INACTIVE = 'INACTIVE', // Inactive client
  PROSPECT = 'PROSPECT', // Prospective client
  ARCHIVED = 'ARCHIVED', // Archived client
}

/**
 * Client Tier Enum
 */
export enum ClientTier {
  BRONZE = 'BRONZE', // Bronze tier
  SILVER = 'SILVER', // Silver tier
  GOLD = 'GOLD', // Gold tier
  PLATINUM = 'PLATINUM', // Platinum tier
}

/**
 * Client Entity
 *
 * Advanced client relationship management with SLA tracking, contract management,
 * project history, and engagement tracking.
 */
@Entity('clients')
@Index('idx_clients_number', ['clientNumber'])
@Index('idx_clients_status', ['clientStatus'])
@Index('idx_clients_tier', ['clientTier'])
@Index('idx_clients_contact', ['contactId'])
@Index('idx_clients_organization', ['organizationId'])
@Index('idx_clients_active', ['isActive'])
export class Client {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique client number (auto-generated or manual)
   */
  @Column({ name: 'client_number', type: 'varchar', length: 64, unique: true, nullable: true })
  clientNumber: string | null;

  /**
   * Reference to contact entity
   */
  @Column({ name: 'contact_id', type: 'bigint', nullable: true })
  contactId: number | null;

  /**
   * Contact relationship
   */
  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  /**
   * Client status
   */
  @Column({
    name: 'client_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ClientStatus.ACTIVE,
  })
  clientStatus: ClientStatus;

  /**
   * Client tier
   */
  @Column({
    name: 'client_tier',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  clientTier: ClientTier | null;

  /**
   * Organization ID (for organization-scoped clients)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Account manager (employee/user ID)
   */
  @Column({ name: 'account_manager_id', type: 'bigint', nullable: true })
  accountManagerId: number | null;

  /**
   * Client since date
   */
  @Column({ name: 'client_since', type: 'date', nullable: true })
  clientSince: Date | null;

  /**
   * Annual revenue (client's annual revenue)
   */
  @Column({ name: 'annual_revenue', type: 'decimal', precision: 15, scale: 2, nullable: true })
  annualRevenue: number | null;

  /**
   * Currency code for annual revenue
   */
  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true, default: 'USD' })
  currencyCode: string | null;

  /**
   * Industry
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  industry: string | null;

  /**
   * Number of employees
   */
  @Column({ name: 'number_of_employees', type: 'integer', nullable: true })
  numberOfEmployees: number | null;

  /**
   * Website
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  /**
   * Billing address line 1
   */
  @Column({ name: 'billing_address_line1', type: 'varchar', length: 255, nullable: true })
  billingAddressLine1: string | null;

  /**
   * Billing address line 2
   */
  @Column({ name: 'billing_address_line2', type: 'varchar', length: 255, nullable: true })
  billingAddressLine2: string | null;

  /**
   * Billing city
   */
  @Column({ name: 'billing_city', type: 'varchar', length: 128, nullable: true })
  billingCity: string | null;

  /**
   * Billing state
   */
  @Column({ name: 'billing_state', type: 'varchar', length: 128, nullable: true })
  billingState: string | null;

  /**
   * Billing postal code
   */
  @Column({ name: 'billing_postal_code', type: 'varchar', length: 32, nullable: true })
  billingPostalCode: string | null;

  /**
   * Billing country
   */
  @Column({ name: 'billing_country', type: 'varchar', length: 64, nullable: true })
  billingCountry: string | null;

  /**
   * Payment terms (e.g., Net 30, Net 60)
   */
  @Column({ name: 'payment_terms', type: 'varchar', length: 64, nullable: true })
  paymentTerms: string | null;

  /**
   * Credit limit
   */
  @Column({ name: 'credit_limit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  creditLimit: number | null;

  /**
   * Tax ID / VAT number
   */
  @Column({ name: 'tax_id', type: 'varchar', length: 64, nullable: true })
  taxId: string | null;

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
   * Client metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'client_metadata', type: 'jsonb', nullable: true })
  clientMetadata: Record<string, any> | null;

  /**
   * Total contract value (sum of all active contracts)
   */
  @Column({
    name: 'total_contract_value',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalContractValue: number | null;

  /**
   * Last project date
   */
  @Column({ name: 'last_project_date', type: 'date', nullable: true })
  lastProjectDate: Date | null;

  /**
   * Total projects count
   */
  @Column({ name: 'total_projects', type: 'integer', nullable: false, default: 0 })
  totalProjects: number;

  /**
   * Active projects count
   */
  @Column({ name: 'active_projects', type: 'integer', nullable: false, default: 0 })
  activeProjects: number;

  /**
   * Whether client is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether client is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * When client was archived
   */
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /**
   * User who archived the client
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
   * Check if client is currently active
   */
  isCurrentlyActive(): boolean {
    return this.isActive && !this.isArchived && this.clientStatus === ClientStatus.ACTIVE;
  }
}
