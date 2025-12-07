import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Account } from './account.entity';

/**
 * Invoice Line Item Type Enum
 */
export enum InvoiceLineItemType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
  DISCOUNT = 'DISCOUNT',
  TAX = 'TAX',
}

/**
 * Invoice Line Item Entity
 *
 * Invoice line items with products/services, quantities, and pricing.
 */
@Entity('invoice_line_items')
@Index('idx_invoice_line_items_invoice', ['invoiceId'])
@Index('idx_invoice_line_items_project', ['projectId'])
@Unique(['invoiceId', 'lineNumber'])
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Invoice this line item belongs to
   */
  @ManyToOne(() => Invoice, (invoice) => invoice.lineItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'invoice_id', type: 'bigint', nullable: false })
  invoiceId: number;

  /**
   * Line number
   */
  @Column({ name: 'line_number', type: 'integer', nullable: false })
  lineNumber: number;

  /**
   * Item description
   */
  @Column({ name: 'item_description', type: 'varchar', length: 255, nullable: false })
  itemDescription: string;

  /**
   * Item type
   */
  @Column({
    name: 'item_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: InvoiceLineItemType.PRODUCT,
  })
  itemType: InvoiceLineItemType;

  /**
   * Quantity
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 1,
  })
  quantity: number;

  /**
   * Unit price
   */
  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  unitPrice: number;

  /**
   * Discount percentage
   */
  @Column({
    name: 'discount_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  discountPercentage: number;

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
   * Tax rate percentage
   */
  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  taxRate: number;

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
   * Line total (quantity * unit_price - discount + tax)
   */
  @Column({
    name: 'line_total',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  lineTotal: number;

  /**
   * Revenue account
   */
  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'revenue_account_id' })
  revenueAccount: Promise<Account | null> | Account | null;

  @Column({ name: 'revenue_account_id', type: 'bigint', nullable: true })
  revenueAccountId: number | null;

  /**
   * Expense account (if applicable)
   */
  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'expense_account_id' })
  expenseAccount: Promise<Account | null> | Account | null;

  @Column({ name: 'expense_account_id', type: 'bigint', nullable: true })
  expenseAccountId: number | null;

  /**
   * Project
   */
  @Column({ name: 'project_id', type: 'bigint', nullable: true })
  projectId: number | null;

  /**
   * Task
   */
  @Column({ name: 'task_id', type: 'bigint', nullable: true })
  taskId: number | null;

  /**
   * Line item metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Calculate line total
   */
  calculateLineTotal(): number {
    const subtotal = this.quantity * this.unitPrice;
    const afterDiscount = subtotal - this.discountAmount;
    return afterDiscount + this.taxAmount;
  }
}
