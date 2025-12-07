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
import { Currency } from './currency.entity';
import { FinancialTransaction } from './financial-transaction.entity';
import { InvoiceLineItem } from './invoice-line-item.entity';

/**
 * Invoice Type Enum
 */
export enum InvoiceType {
  STANDARD = 'STANDARD',
  CREDIT_MEMO = 'CREDIT_MEMO',
  DEBIT_MEMO = 'DEBIT_MEMO',
  PROFORMA = 'PROFORMA',
}

/**
 * Invoice Status Enum
 */
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

/**
 * Invoice Entity
 * 
 * Invoice generation and tracking with payment status.
 */
@Entity('invoices')
@Index('idx_invoices_number', ['invoiceNumber'])
@Index('idx_invoices_date', ['invoiceDate'])
@Index('idx_invoices_due_date', ['dueDate'])
@Index('idx_invoices_status', ['invoiceStatus'])
@Index('idx_invoices_client', ['clientId'])
@Index('idx_invoices_contact', ['contactId'])
@Index('idx_invoices_transaction', ['transactionId'])
@Index('idx_invoices_project', ['projectId'])
@Index('idx_invoices_outstanding', ['outstandingAmount'])
export class Invoice {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Invoice number (e.g., "INV-2024-001")
   */
  @Column({ name: 'invoice_number', type: 'varchar', length: 64, unique: true, nullable: false })
  invoiceNumber: string;

  /**
   * Invoice date
   */
  @Column({ name: 'invoice_date', type: 'date', nullable: false })
  invoiceDate: Date;

  /**
   * Due date
   */
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  /**
   * Client ID
   */
  @Column({ name: 'client_id', type: 'bigint', nullable: true })
  clientId: number | null;

  /**
   * Contact ID
   */
  @Column({ name: 'contact_id', type: 'bigint', nullable: true })
  contactId: number | null;

  /**
   * Bill to contact ID
   */
  @Column({ name: 'bill_to_contact_id', type: 'bigint', nullable: true })
  billToContactId: number | null;

  /**
   * Invoice type
   */
  @Column({
    name: 'invoice_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: InvoiceType.STANDARD,
  })
  invoiceType: InvoiceType;

  /**
   * Invoice status
   */
  @Column({
    name: 'invoice_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: InvoiceStatus.DRAFT,
  })
  invoiceStatus: InvoiceStatus;

  /**
   * Subtotal (before tax)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  subtotal: number;

  /**
   * Tax amount
   */
  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  taxAmount: number;

  /**
   * Discount amount
   */
  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  discountAmount: number;

  /**
   * Total amount (subtotal + tax - discount)
   */
  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalAmount: number;

  /**
   * Paid amount
   */
  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  paidAmount: number;

  /**
   * Outstanding amount (total - paid)
   */
  @Column({
    name: 'outstanding_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  outstandingAmount: number;

  /**
   * Currency
   */
  @ManyToOne(() => Currency, {
    nullable: true,
    onDelete: 'RESTRICT',
    lazy: true,
  })
  @JoinColumn({ name: 'currency_id' })
  currency: Promise<Currency | null> | Currency | null;

  @Column({ name: 'currency_id', type: 'bigint', nullable: true })
  currencyId: number | null;

  /**
   * Currency code (for quick access)
   */
  @Column({ type: 'varchar', length: 8, nullable: false, default: 'USD' })
  currencyCode: string;

  /**
   * Exchange rate if currency differs from base
   */
  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  exchangeRate: number | null;

  /**
   * Payment terms (e.g., "Net 30", "Due on Receipt")
   */
  @Column({ name: 'payment_terms', type: 'varchar', length: 128, nullable: true })
  paymentTerms: string | null;

  /**
   * Payment method (if known)
   */
  @Column({ name: 'payment_method', type: 'varchar', length: 64, nullable: true })
  paymentMethod: string | null;

  /**
   * Invoice description
   */
  @Column({ name: 'invoice_description', type: 'text', nullable: true })
  invoiceDescription: string | null;

  /**
   * Internal notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Notes visible to customer
   */
  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes: string | null;

  /**
   * Date invoice was sent
   */
  @Column({ name: 'sent_date', type: 'date', nullable: true })
  sentDate: Date | null;

  /**
   * Date invoice was viewed
   */
  @Column({ name: 'viewed_date', type: 'timestamptz', nullable: true })
  viewedDate: Date | null;

  /**
   * Date invoice was fully paid
   */
  @Column({ name: 'paid_date', type: 'date', nullable: true })
  paidDate: Date | null;

  /**
   * Related transaction
   */
  @ManyToOne(() => FinancialTransaction, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Promise<FinancialTransaction | null> | FinancialTransaction | null;

  @Column({ name: 'transaction_id', type: 'bigint', nullable: true })
  transactionId: number | null;

  /**
   * Project link
   */
  @Column({ name: 'project_id', type: 'bigint', nullable: true })
  projectId: number | null;

  /**
   * Invoice metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Invoice line items
   */
  @OneToMany(() => InvoiceLineItem, (lineItem) => lineItem.invoice, {
    cascade: true,
    lazy: true,
  })
  lineItems: Promise<InvoiceLineItem[]> | InvoiceLineItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if invoice is paid
   */
  isPaid(): boolean {
    return this.invoiceStatus === InvoiceStatus.PAID || this.outstandingAmount === 0;
  }

  /**
   * Check if invoice is overdue
   */
  isOverdue(): boolean {
    if (!this.dueDate || this.isPaid()) {
      return false;
    }
    return new Date() > new Date(this.dueDate);
  }

  /**
   * Calculate payment percentage
   */
  getPaymentPercentage(): number {
    if (this.totalAmount === 0) {
      return 0;
    }
    return (this.paidAmount / this.totalAmount) * 100;
  }
}
