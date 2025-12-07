import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Account } from './account.entity';
import { Currency } from './currency.entity';
import { FinancialTransaction } from './financial-transaction.entity';

/**
 * Account Balance Entity
 * 
 * Cached account balances for performance and reporting.
 */
@Entity('account_balances')
@Index('idx_account_balances_account', ['accountId'])
@Index('idx_account_balances_date', ['balanceDate'])
@Index('idx_account_balances_account_date', ['accountId', 'balanceDate'])
@Unique(['accountId', 'balanceDate'])
export class AccountBalance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Account
   */
  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'account_id' })
  account: Promise<Account> | Account;

  @Column({ name: 'account_id', type: 'bigint', nullable: false })
  accountId: number;

  /**
   * Date of balance
   */
  @Column({ name: 'balance_date', type: 'date', nullable: false })
  balanceDate: Date;

  /**
   * Debit balance
   */
  @Column({
    name: 'debit_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  debitBalance: number;

  /**
   * Credit balance
   */
  @Column({
    name: 'credit_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  creditBalance: number;

  /**
   * Net balance (debit - credit or credit - debit)
   */
  @Column({
    name: 'net_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  netBalance: number;

  /**
   * Number of transactions
   */
  @Column({
    name: 'transaction_count',
    type: 'integer',
    nullable: false,
    default: 0,
  })
  transactionCount: number;

  /**
   * Number of debit entries
   */
  @Column({
    name: 'debit_count',
    type: 'integer',
    nullable: false,
    default: 0,
  })
  debitCount: number;

  /**
   * Number of credit entries
   */
  @Column({
    name: 'credit_count',
    type: 'integer',
    nullable: false,
    default: 0,
  })
  creditCount: number;

  /**
   * Last transaction date
   */
  @Column({ name: 'last_transaction_date', type: 'date', nullable: true })
  lastTransactionDate: Date | null;

  /**
   * Last transaction
   */
  @ManyToOne(() => FinancialTransaction, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'last_transaction_id' })
  lastTransaction: Promise<FinancialTransaction | null> | FinancialTransaction | null;

  @Column({ name: 'last_transaction_id', type: 'bigint', nullable: true })
  lastTransactionId: number | null;

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
   * Balance metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * When balance was calculated
   */
  @Column({ name: 'calculated_at', type: 'timestamptz', nullable: false, default: () => 'now()' })
  calculatedAt: Date;
}
