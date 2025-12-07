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
import { Account } from './account.entity';
import { Invoice } from './invoice.entity';
import { FinancialTransaction } from './financial-transaction.entity';
import { PaymentAllocation } from './payment-allocation.entity';

/**
 * Payment Type Enum
 */
export enum PaymentType {
  RECEIPT = 'RECEIPT', // Customer payment
  PAYMENT = 'PAYMENT', // Vendor payment
  REFUND = 'REFUND',
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  ACH = 'ACH',
  OTHER = 'OTHER',
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Payment Entity
 * 
 * Payment tracking and reconciliation for invoices and transactions.
 */
@Entity('payments')
@Index('idx_payments_number', ['paymentNumber'])
@Index('idx_payments_date', ['paymentDate'])
@Index('idx_payments_type', ['paymentType'])
@Index('idx_payments_status', ['paymentStatus'])
@Index('idx_payments_invoice', ['invoiceId'])
@Index('idx_payments_transaction', ['transactionId'])
@Index('idx_payments_bank_account', ['bankAccountId'])
@Index('idx_payments_reconciled', ['isReconciled'])
export class Payment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Payment number (e.g., "PAY-2024-001")
   */
  @Column({ name: 'payment_number', type: 'varchar', length: 64, unique: true, nullable: false })
  paymentNumber: string;

  /**
   * Payment date
   */
  @Column({ name: 'payment_date', type: 'date', nullable: false })
  paymentDate: Date;

  /**
   * Payment type
   */
  @Column({
    name: 'payment_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  paymentType: PaymentType;

  /**
   * Payment method
   */
  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  paymentMethod: PaymentMethod;

  /**
   * Payment status
   */
  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  /**
   * Payer (contact/client/vendor ID)
   */
  @Column({ name: 'payer_id', type: 'bigint', nullable: true })
  payerId: number | null;

  /**
   * Payer type
   */
  @Column({ name: 'payer_type', type: 'varchar', length: 32, nullable: true })
  payerType: string | null;

  /**
   * Payee (contact/client/vendor ID)
   */
  @Column({ name: 'payee_id', type: 'bigint', nullable: true })
  payeeId: number | null;

  /**
   * Payee type
   */
  @Column({ name: 'payee_type', type: 'varchar', length: 32, nullable: true })
  payeeType: string | null;

  /**
   * Payment amount
   */
  @Column({
    name: 'payment_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  paymentAmount: number;

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
   * Reference number (check number, transaction ID, etc.)
   */
  @Column({ name: 'reference_number', type: 'varchar', length: 128, nullable: true })
  referenceNumber: string | null;

  /**
   * External payment gateway transaction ID
   */
  @Column({ name: 'external_transaction_id', type: 'varchar', length: 128, nullable: true })
  externalTransactionId: string | null;

  /**
   * Bank account for payment
   */
  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: Promise<Account | null> | Account | null;

  @Column({ name: 'bank_account_id', type: 'bigint', nullable: true })
  bankAccountId: number | null;

  /**
   * Related invoice
   */
  @ManyToOne(() => Invoice, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Promise<Invoice | null> | Invoice | null;

  @Column({ name: 'invoice_id', type: 'bigint', nullable: true })
  invoiceId: number | null;

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
   * Payment description
   */
  @Column({ name: 'payment_description', type: 'text', nullable: true })
  paymentDescription: string | null;

  /**
   * Notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Whether payment is reconciled
   */
  @Column({ name: 'is_reconciled', type: 'boolean', nullable: false, default: false })
  isReconciled: boolean;

  /**
   * When payment was reconciled
   */
  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
  reconciledAt: Date | null;

  /**
   * User who reconciled the payment
   */
  @Column({ name: 'reconciled_by', type: 'bigint', nullable: true })
  reconciledBy: number | null;

  /**
   * Payment metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Payment allocations
   */
  @OneToMany(() => PaymentAllocation, (allocation) => allocation.payment, {
    cascade: true,
    lazy: true,
  })
  allocations: Promise<PaymentAllocation[]> | PaymentAllocation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if payment is completed
   */
  isCompleted(): boolean {
    return this.paymentStatus === PaymentStatus.COMPLETED;
  }

  /**
   * Check if payment is reconciled
   */
  isReconciledPayment(): boolean {
    return this.isReconciled;
  }
}
