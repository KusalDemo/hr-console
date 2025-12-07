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
import { TransactionLineItem } from './transaction-line-item.entity';

/**
 * Transaction Type Enum
 */
export enum TransactionType {
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
}

/**
 * Transaction Status Enum
 */
export enum TransactionStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Financial Transaction Entity
 *
 * Journal entries with double-entry bookkeeping support.
 * Supports invoices, payments, receipts, adjustments, and transfers.
 */
@Entity('financial_transactions')
@Index('idx_financial_transactions_number', ['transactionNumber'])
@Index('idx_financial_transactions_date', ['transactionDate'])
@Index('idx_financial_transactions_type', ['transactionType'])
@Index('idx_financial_transactions_status', ['status'])
@Index('idx_financial_transactions_reference', ['transactionReference'])
@Index('idx_financial_transactions_entity', ['entityType', 'entityId'])
@Index('idx_financial_transactions_posted', ['postedAt'])
export class FinancialTransaction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Transaction number (e.g., "JE-2024-001")
   */
  @Column({
    name: 'transaction_number',
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: false,
  })
  transactionNumber: string;

  /**
   * Transaction date
   */
  @Column({ name: 'transaction_date', type: 'date', nullable: false })
  transactionDate: Date;

  /**
   * Transaction type
   */
  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  transactionType: TransactionType;

  /**
   * Reference number (e.g., invoice number, check number)
   */
  @Column({ name: 'transaction_reference', type: 'varchar', length: 128, nullable: true })
  transactionReference: string | null;

  /**
   * Transaction description
   */
  @Column({ type: 'text', nullable: false })
  description: string;

  /**
   * Additional memo/notes
   */
  @Column({ type: 'text', nullable: true })
  memo: string | null;

  /**
   * Transaction status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TransactionStatus.DRAFT,
  })
  status: TransactionStatus;

  /**
   * Whether transaction is reversed
   */
  @Column({ name: 'is_reversed', type: 'boolean', nullable: false, default: false })
  isReversed: boolean;

  /**
   * Original transaction if reversed
   */
  @ManyToOne(() => FinancialTransaction, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'reversal_transaction_id' })
  reversalTransaction: Promise<FinancialTransaction | null> | FinancialTransaction | null;

  @Column({ name: 'reversal_transaction_id', type: 'bigint', nullable: true })
  reversalTransactionId: number | null;

  /**
   * Reversal transaction if this is a reversal
   */
  @ManyToOne(() => FinancialTransaction, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'reversed_transaction_id' })
  reversedTransaction: Promise<FinancialTransaction | null> | FinancialTransaction | null;

  @Column({ name: 'reversed_transaction_id', type: 'bigint', nullable: true })
  reversedTransactionId: number | null;

  /**
   * Whether transaction requires approval
   */
  @Column({ name: 'requires_approval', type: 'boolean', nullable: false, default: false })
  requiresApproval: boolean;

  /**
   * User who approved the transaction
   */
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: number | null;

  /**
   * When transaction was approved
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * User who rejected the transaction
   */
  @Column({ name: 'rejected_by', type: 'bigint', nullable: true })
  rejectedBy: number | null;

  /**
   * When transaction was rejected
   */
  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  /**
   * Rejection reason
   */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

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
   * Total debit amount
   */
  @Column({
    name: 'total_debits',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalDebits: number;

  /**
   * Total credit amount
   */
  @Column({
    name: 'total_credits',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalCredits: number;

  /**
   * Whether debits equal credits
   */
  @Column({ name: 'is_balanced', type: 'boolean', nullable: false, default: false })
  isBalanced: boolean;

  /**
   * Entity type (e.g., "PROJECT", "EMPLOYEE", "CLIENT")
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: true })
  entityType: string | null;

  /**
   * Entity ID
   */
  @Column({ name: 'entity_id', type: 'bigint', nullable: true })
  entityId: number | null;

  /**
   * Transaction metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * When transaction was posted
   */
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  /**
   * User who posted the transaction
   */
  @Column({ name: 'posted_by', type: 'bigint', nullable: true })
  postedBy: number | null;

  /**
   * Transaction line items
   */
  @OneToMany(() => TransactionLineItem, (lineItem) => lineItem.transaction, {
    cascade: true,
    lazy: true,
  })
  lineItems: Promise<TransactionLineItem[]> | TransactionLineItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if transaction is posted
   */
  isPosted(): boolean {
    return this.status === TransactionStatus.POSTED;
  }

  /**
   * Check if transaction is balanced
   */
  checkBalance(): boolean {
    return this.totalDebits === this.totalCredits;
  }

  /**
   * Calculate balance difference
   */
  getBalanceDifference(): number {
    return Math.abs(this.totalDebits - this.totalCredits);
  }
}
