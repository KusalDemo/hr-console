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

/**
 * Vendor Type Enum
 */
export enum VendorType {
  SUPPLIER = 'SUPPLIER', // Supplier
  CONTRACTOR = 'CONTRACTOR', // Contractor
  CONSULTANT = 'CONSULTANT', // Consultant
  SERVICE_PROVIDER = 'SERVICE_PROVIDER', // Service provider
  OTHER = 'OTHER', // Other
}

/**
 * Vendor Status Enum
 */
export enum VendorStatus {
  ACTIVE = 'ACTIVE', // Active vendor
  INACTIVE = 'INACTIVE', // Inactive vendor
  PENDING = 'PENDING', // Pending approval
  SUSPENDED = 'SUSPENDED', // Suspended vendor
  ARCHIVED = 'ARCHIVED', // Archived vendor
}

/**
 * Vendor Entity
 *
 * Vendor relationship management with performance tracking, ratings, and certifications.
 */
@Entity('vendors')
@Index('idx_vendors_number', ['vendorNumber'])
@Index('idx_vendors_type', ['vendorType'])
@Index('idx_vendors_status', ['vendorStatus'])
@Index('idx_vendors_contact', ['contactId'])
@Index('idx_vendors_organization', ['organizationId'])
@Index('idx_vendors_active', ['isActive'])
export class Vendor {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique vendor number (auto-generated or manual)
   */
  @Column({ name: 'vendor_number', type: 'varchar', length: 64, unique: true, nullable: true })
  vendorNumber: string | null;

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
   * Vendor type
   */
  @Column({
    name: 'vendor_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: VendorType.OTHER,
  })
  vendorType: VendorType;

  /**
   * Vendor status
   */
  @Column({
    name: 'vendor_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: VendorStatus.PENDING,
  })
  vendorStatus: VendorStatus;

  /**
   * Organization ID (for organization-scoped vendors)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Vendor manager (employee/user ID)
   */
  @Column({ name: 'vendor_manager_id', type: 'bigint', nullable: true })
  vendorManagerId: number | null;

  /**
   * Vendor since date
   */
  @Column({ name: 'vendor_since', type: 'date', nullable: true })
  vendorSince: Date | null;

  /**
   * Industry
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  industry: string | null;

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
   * Tax ID / VAT number
   */
  @Column({ name: 'tax_id', type: 'varchar', length: 64, nullable: true })
  taxId: string | null;

  /**
   * Average rating (computed from vendor ratings)
   */
  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  averageRating: number | null;

  /**
   * Total ratings count
   */
  @Column({ name: 'total_ratings', type: 'integer', nullable: false, default: 0 })
  totalRatings: number;

  /**
   * Total purchase orders count
   */
  @Column({ name: 'total_purchase_orders', type: 'integer', nullable: false, default: 0 })
  totalPurchaseOrders: number;

  /**
   * Total purchase order value
   */
  @Column({ name: 'total_po_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalPoValue: number | null;

  /**
   * Currency code for PO value
   */
  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true, default: 'USD' })
  currencyCode: string | null;

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
   * Vendor metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'vendor_metadata', type: 'jsonb', nullable: true })
  vendorMetadata: Record<string, any> | null;

  /**
   * Whether vendor is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether vendor is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * When vendor was archived
   */
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /**
   * User who archived the vendor
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
   * Check if vendor is currently active
   */
  isCurrentlyActive(): boolean {
    return this.isActive && !this.isArchived && this.vendorStatus === VendorStatus.ACTIVE;
  }
}
