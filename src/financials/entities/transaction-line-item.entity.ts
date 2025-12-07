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
import { FinancialTransaction } from './financial-transaction.entity';
import { Account } from './account.entity';

/**
 * Transaction Line Item Entity
 *
 * Individual debit/credit entries for double-entry bookkeeping.
 * Each transaction must have balanced debits and credits.
 */
@Entity('transaction_line_items')
@Index('idx_transaction_line_items_transaction', ['transactionId'])
@Index('idx_transaction_line_items_account', ['accountId'])
@Index('idx_transaction_line_items_entity', ['entityType', 'entityId'])
@Index('idx_transaction_line_items_project', ['projectId'])
@Unique(['transactionId', 'lineNumber'])
export class TransactionLineItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Transaction this line item belongs to
   */
  @ManyToOne(() => FinancialTransaction, (transaction) => transaction.lineItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: FinancialTransaction;

  @Column({ name: 'transaction_id', type: 'bigint', nullable: false })
  transactionId: number;

  /**
   * Line number within transaction
   */
  @Column({ name: 'line_number', type: 'integer', nullable: false })
  lineNumber: number;

  /**
   * Account
   */
  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: 'RESTRICT',
    lazy: true,
  })
  @JoinColumn({ name: 'account_id' })
  account: Promise<Account> | Account;

  @Column({ name: 'account_id', type: 'bigint', nullable: false })
  accountId: number;

  /**
   * Debit amount
   */
  @Column({
    name: 'debit_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  debitAmount: number;

  /**
   * Credit amount
   */
  @Column({
    name: 'credit_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  creditAmount: number;

  /**
   * Line item description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Line item memo
   */
  @Column({ type: 'text', nullable: true })
  memo: string | null;

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
   * Cost center
   */
  @Column({ name: 'cost_center_id', type: 'bigint', nullable: true })
  costCenterId: number | null;

  /**
   * Department
   */
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Project (if applicable)
   */
  @Column({ name: 'project_id', type: 'bigint', nullable: true })
  projectId: number | null;

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
   * Get net amount (debit - credit)
   */
  getNetAmount(): number {
    return this.debitAmount - this.creditAmount;
  }

  /**
   * Check if line item is a debit
   */
  isDebit(): boolean {
    return this.debitAmount > 0 && this.creditAmount === 0;
  }

  /**
   * Check if line item is a credit
   */
  isCredit(): boolean {
    return this.creditAmount > 0 && this.debitAmount === 0;
  }
}
