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
import { Vendor } from './vendor.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

/**
 * Purchase Order Status Enum
 */
export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT', // Draft
  PENDING = 'PENDING', // Pending approval
  APPROVED = 'APPROVED', // Approved
  SENT = 'SENT', // Sent to vendor
  ACKNOWLEDGED = 'ACKNOWLEDGED', // Acknowledged by vendor
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', // Partially received
  RECEIVED = 'RECEIVED', // Fully received
  INVOICED = 'INVOICED', // Invoiced
  CLOSED = 'CLOSED', // Closed
  CANCELLED = 'CANCELLED', // Cancelled
}

/**
 * Purchase Order Entity
 * 
 * Purchase orders for vendor procurement with line items, approval workflow, and tracking.
 */
@Entity('purchase_orders')
@Index('idx_po_number', ['poNumber'])
@Index('idx_po_status', ['poStatus'])
@Index('idx_po_vendor', ['vendorId'])
@Index('idx_po_organization', ['organizationId'])
@Index('idx_po_date', ['poDate'])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique PO number (auto-generated or manual)
   */
  @Column({ name: 'po_number', type: 'varchar', length: 64, unique: true, nullable: false })
  poNumber: string;

  /**
   * Reference to vendor
   */
  @Column({ name: 'vendor_id', type: 'bigint', nullable: false })
  vendorId: number;

  /**
   * Vendor relationship
   */
  @ManyToOne(() => Vendor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  /**
   * PO status
   */
  @Column({
    name: 'po_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: PurchaseOrderStatus.DRAFT,
  })
  poStatus: PurchaseOrderStatus;

  /**
   * Organization ID (for organization-scoped POs)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * PO date
   */
  @Column({ name: 'po_date', type: 'date', nullable: false })
  poDate: Date;

  /**
   * Expected delivery date
   */
  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate: Date | null;

  /**
   * Actual delivery date
   */
  @Column({ name: 'actual_delivery_date', type: 'date', nullable: true })
  actualDeliveryDate: Date | null;

  /**
   * Requested by (employee/user ID)
   */
  @Column({ name: 'requested_by', type: 'bigint', nullable: true })
  requestedBy: number | null;

  /**
   * Approved by (employee/user ID)
   */
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: number | null;

  /**
   * Approval date
   */
  @Column({ name: 'approval_date', type: 'timestamptz', nullable: true })
  approvalDate: Date | null;

  /**
   * Total amount (sum of line items)
   */
  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  totalAmount: number;

  /**
   * Currency code
   */
  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: false, default: 'USD' })
  currencyCode: string;

  /**
   * Tax amount
   */
  @Column({ name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  taxAmount: number;

  /**
   * Shipping amount
   */
  @Column({ name: 'shipping_amount', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  shippingAmount: number;

  /**
   * Discount amount
   */
  @Column({ name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  discountAmount: number;

  /**
   * Grand total (total + tax + shipping - discount)
   */
  @Column({ name: 'grand_total', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  grandTotal: number;

  /**
   * Shipping address line 1
   */
  @Column({ name: 'shipping_address_line1', type: 'varchar', length: 255, nullable: true })
  shippingAddressLine1: string | null;

  /**
   * Shipping address line 2
   */
  @Column({ name: 'shipping_address_line2', type: 'varchar', length: 255, nullable: true })
  shippingAddressLine2: string | null;

  /**
   * Shipping city
   */
  @Column({ name: 'shipping_city', type: 'varchar', length: 128, nullable: true })
  shippingCity: string | null;

  /**
   * Shipping state
   */
  @Column({ name: 'shipping_state', type: 'varchar', length: 128, nullable: true })
  shippingState: string | null;

  /**
   * Shipping postal code
   */
  @Column({ name: 'shipping_postal_code', type: 'varchar', length: 32, nullable: true })
  shippingPostalCode: string | null;

  /**
   * Shipping country
   */
  @Column({ name: 'shipping_country', type: 'varchar', length: 64, nullable: true })
  shippingCountry: string | null;

  /**
   * Terms and conditions
   */
  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions: string | null;

  /**
   * Notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * PO metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'po_metadata', type: 'jsonb', nullable: true })
  poMetadata: Record<string, any> | null;

  /**
   * Purchase order items
   */
  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
    lazy: true,
  })
  items: Promise<PurchaseOrderItem[]> | PurchaseOrderItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}

