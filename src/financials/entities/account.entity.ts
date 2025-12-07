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

/**
 * Account Type Enum
 */
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

/**
 * Account Category Enum
 */
export enum AccountCategory {
  CURRENT_ASSET = 'CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  INTANGIBLE_ASSET = 'INTANGIBLE_ASSET',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  COST_OF_GOODS_SOLD = 'COST_OF_GOODS_SOLD',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  NON_OPERATING_EXPENSE = 'NON_OPERATING_EXPENSE',
  OTHER_INCOME = 'OTHER_INCOME',
  OTHER_EXPENSE = 'OTHER_EXPENSE',
}

/**
 * Normal Balance Enum
 */
export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

/**
 * Account Entity
 * 
 * Chart of accounts with account types, categories, and hierarchy.
 * Supports account balances, currency, and double-entry bookkeeping.
 */
@Entity('accounts')
@Index('idx_accounts_number', ['accountNumber'])
@Index('idx_accounts_type', ['accountType'])
@Index('idx_accounts_category', ['accountCategory'])
@Index('idx_accounts_parent', ['parentAccountId'])
@Index('idx_accounts_active', ['isActive'])
@Index('idx_accounts_path', ['accountPath'])
@Index('idx_accounts_currency', ['currencyId'])
export class Account {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Account number (e.g., "1000", "2000", "4000")
   */
  @Column({ name: 'account_number', type: 'varchar', length: 64, unique: true, nullable: false })
  accountNumber: string;

  /**
   * Account name (e.g., "Cash", "Accounts Receivable", "Revenue")
   */
  @Column({ name: 'account_name', type: 'varchar', length: 255, nullable: false })
  accountName: string;

  /**
   * Account type
   */
  @Column({
    name: 'account_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  accountType: AccountType;

  /**
   * Account category
   */
  @Column({
    name: 'account_category',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  accountCategory: AccountCategory;

  /**
   * Account subcategory
   */
  @Column({ name: 'account_subcategory', type: 'varchar', length: 128, nullable: true })
  accountSubcategory: string | null;

  /**
   * Parent account for sub-accounts
   */
  @ManyToOne(() => Account, (account) => account.childAccounts, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'parent_account_id' })
  parentAccount: Promise<Account | null> | Account | null;

  @Column({ name: 'parent_account_id', type: 'bigint', nullable: true })
  parentAccountId: number | null;

  /**
   * Child accounts (sub-accounts)
   */
  @OneToMany(() => Account, (account) => account.parentAccount, {
    cascade: false,
    lazy: true,
  })
  childAccounts: Promise<Account[]> | Account[];

  /**
   * Hierarchy level (1 = top level)
   */
  @Column({ name: 'account_level', type: 'integer', nullable: false, default: 1 })
  accountLevel: number;

  /**
   * Path like "1.2.3" for hierarchy navigation
   */
  @Column({ name: 'account_path', type: 'varchar', length: 512, nullable: true })
  accountPath: string | null;

  /**
   * Whether account is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * System-defined account (not user-created)
   */
  @Column({ name: 'is_system_account', type: 'boolean', nullable: false, default: false })
  isSystemAccount: boolean;

  /**
   * Summary account (parent of sub-accounts)
   */
  @Column({ name: 'is_summary_account', type: 'boolean', nullable: false, default: false })
  isSummaryAccount: boolean;

  /**
   * Normal balance side
   */
  @Column({
    name: 'normal_balance',
    type: 'varchar',
    length: 8,
    nullable: false,
    default: NormalBalance.DEBIT,
  })
  normalBalance: NormalBalance;

  /**
   * Opening balance
   */
  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  openingBalance: number;

  /**
   * Current balance (calculated)
   */
  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  currentBalance: number;

  /**
   * Date of last balance calculation
   */
  @Column({ name: 'balance_as_of_date', type: 'date', nullable: true })
  balanceAsOfDate: Date | null;

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
   * Whether transactions can be posted to this account
   */
  @Column({ name: 'allows_postings', type: 'boolean', nullable: false, default: true })
  allowsPostings: boolean;

  /**
   * Whether transactions require approval
   */
  @Column({ name: 'requires_approval', type: 'boolean', nullable: false, default: false })
  requiresApproval: boolean;

  /**
   * Whether account requires reconciliation
   */
  @Column({ name: 'reconcile_required', type: 'boolean', nullable: false, default: false })
  reconcileRequired: boolean;

  /**
   * Whether this is a bank account
   */
  @Column({ name: 'is_bank_account', type: 'boolean', nullable: false, default: false })
  isBankAccount: boolean;

  /**
   * Whether this is a tax account
   */
  @Column({ name: 'is_tax_account', type: 'boolean', nullable: false, default: false })
  isTaxAccount: boolean;

  /**
   * Account description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Tax code for reporting
   */
  @Column({ name: 'tax_code', type: 'varchar', length: 64, nullable: true })
  taxCode: string | null;

  /**
   * Cost center association
   */
  @Column({ name: 'cost_center_id', type: 'bigint', nullable: true })
  costCenterId: number | null;

  /**
   * Department association
   */
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Account metadata (JSONB for additional flexible data)
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
   * Check if account is active
   */
  isActiveAccount(): boolean {
    return this.isActive;
  }

  /**
   * Check if account allows postings
   */
  canPost(): boolean {
    return this.isActive && this.allowsPostings;
  }

  /**
   * Get net balance based on normal balance
   */
  getNetBalance(): number {
    if (this.normalBalance === NormalBalance.DEBIT) {
      return this.currentBalance;
    } else {
      return -this.currentBalance;
    }
  }
}
