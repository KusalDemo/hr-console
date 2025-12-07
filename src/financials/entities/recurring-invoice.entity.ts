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
import { Currency } from './currency.entity';
import { Invoice } from './invoice.entity';

/**
 * Recurrence Type Enum
 */
export enum RecurrenceType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

/**
 * Recurring Invoice Status Enum
 */
export enum RecurringInvoiceStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Recurring Invoice Entity
 * 
 * Recurring invoice schedules with automatic generation and delivery.
 */
@Entity('recurring_invoices')
@Index('idx_recurring_invoices_number', ['recurringInvoiceNumber'])
@Index('idx_recurring_invoices_status', ['status'])
@Index('idx_recurring_invoices_active', ['isActive'])
@Index('idx_recurring_invoices_next_date', ['nextInvoiceDate'])
@Index('idx_recurring_invoices_client', ['clientId'])
export class RecurringInvoice {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Recurring invoice identifier
   */
  @Column({
    name: 'recurring_invoice_number',
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: false,
  })
  recurringInvoiceNumber: string;

  /**
   * Invoice template ID
   */
  @Column({ name: 'invoice_template_id', type: 'bigint', nullable: true })
  invoiceTemplateId: number | null;

  /**
   * Billing rule ID
   */
  @Column({ name: 'billing_rule_id', type: 'bigint', nullable: true })
  billingRuleId: number | null;

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
   * Recurrence type
   */
  @Column({
    name: 'recurrence_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  recurrenceType: RecurrenceType;

  /**
   * Recurrence interval
   */
  @Column({ name: 'recurrence_interval', type: 'integer', nullable: false, default: 1 })
  recurrenceInterval: number;

  /**
   * Day of month (1-31) or day of week (1-7)
   */
  @Column({ name: 'recurrence_day', type: 'integer', nullable: true })
  recurrenceDay: number | null;

  /**
   * End date for recurrence
   */
  @Column({ name: 'recurrence_end_date', type: 'date', nullable: true })
  recurrenceEndDate: Date | null;

  /**
   * Number of occurrences
   */
  @Column({ name: 'recurrence_count', type: 'integer', nullable: true })
  recurrenceCount: number | null;

  /**
   * Next invoice generation date
   */
  @Column({ name: 'next_invoice_date', type: 'date', nullable: false })
  nextInvoiceDate: Date;

  /**
   * Base subtotal
   */
  @Column({
    name: 'base_subtotal',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  baseSubtotal: number;

  /**
   * Base tax amount
   */
  @Column({
    name: 'base_tax_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  baseTaxAmount: number;

  /**
   * Base total amount
   */
  @Column({
    name: 'base_total_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  baseTotalAmount: number;

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
   * Payment terms
   */
  @Column({ name: 'payment_terms', type: 'varchar', length: 128, nullable: true })
  paymentTerms: string | null;

  /**
   * Days until due date
   */
  @Column({ name: 'due_date_days', type: 'integer', nullable: true, default: 30 })
  dueDateDays: number | null;

  /**
   * Status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: RecurringInvoiceStatus.ACTIVE,
  })
  status: RecurringInvoiceStatus;

  /**
   * Whether schedule is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Automatically generate invoices
   */
  @Column({ name: 'auto_generate', type: 'boolean', nullable: false, default: true })
  autoGenerate: boolean;

  /**
   * Automatically send invoices
   */
  @Column({ name: 'auto_send', type: 'boolean', nullable: false, default: false })
  autoSend: boolean;

  /**
   * Send payment reminders
   */
  @Column({ name: 'send_reminders', type: 'boolean', nullable: false, default: false })
  sendReminders: boolean;

  /**
   * Days before due date to send reminder
   */
  @Column({ name: 'reminder_days_before_due', type: 'integer', nullable: true })
  reminderDaysBeforeDue: number | null;

  /**
   * Total invoices generated
   */
  @Column({
    name: 'total_invoices_generated',
    type: 'integer',
    nullable: false,
    default: 0,
  })
  totalInvoicesGenerated: number;

  /**
   * Date of last invoice generated
   */
  @Column({ name: 'last_invoice_date', type: 'date', nullable: true })
  lastInvoiceDate: Date | null;

  /**
   * Last invoice generated
   */
  @ManyToOne(() => Invoice, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'last_invoice_id' })
  lastInvoice: Promise<Invoice | null> | Invoice | null;

  @Column({ name: 'last_invoice_id', type: 'bigint', nullable: true })
  lastInvoiceId: number | null;

  /**
   * Description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Recurring invoice metadata (JSONB for additional flexible data)
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

  /**
   * Check if next invoice is due
   */
  isDueForGeneration(date?: Date): boolean {
    const checkDate = date || new Date();
    return checkDate >= new Date(this.nextInvoiceDate);
  }

  /**
   * Check if recurrence is complete
   */
  isComplete(): boolean {
    if (this.recurrenceEndDate && new Date() > new Date(this.recurrenceEndDate)) {
      return true;
    }

    if (this.recurrenceCount && this.totalInvoicesGenerated >= this.recurrenceCount) {
      return true;
    }

    return false;
  }
}
