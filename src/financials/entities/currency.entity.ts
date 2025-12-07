import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ExchangeRate } from './exchange-rate.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Currency Status Enum
 */
export enum CurrencyStatus {
  ACTIVE = 'ACTIVE', // Active currency
  INACTIVE = 'INACTIVE', // Inactive currency
  ARCHIVED = 'ARCHIVED', // Archived currency
}

/**
 * Currency Entity
 *
 * Represents supported currencies in the system with:
 * - ISO 4217 currency codes (USD, EUR, GBP, etc.)
 * - Currency symbols and display names
 * - Decimal places for formatting
 * - Status tracking
 * - Organization-specific currency preferences
 */
@Entity('currencies')
@Index('idx_currencies_code', ['code'])
@Index('idx_currencies_status', ['status'])
@Index('idx_currencies_organization', ['organizationId'])
export class Currency {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * ISO 4217 currency code (e.g., USD, EUR, GBP, JPY)
   */
  @Column({ type: 'varchar', length: 3, unique: true, nullable: false })
  code: string;

  /**
   * Currency name (e.g., US Dollar, Euro, British Pound)
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Currency symbol (e.g., $, €, £, ¥)
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  symbol: string | null;

  /**
   * Number of decimal places for this currency
   * (e.g., 2 for USD, 0 for JPY)
   */
  @Column({ name: 'decimal_places', type: 'integer', nullable: false, default: 2 })
  decimalPlaces: number;

  /**
   * Currency status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CurrencyStatus.ACTIVE,
  })
  status: CurrencyStatus;

  /**
   * Organization this currency is associated with (null for global currencies)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Whether this is the default currency for the organization
   */
  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  /**
   * Display format template (e.g., "{symbol}{amount}", "{amount} {code}")
   */
  @Column({ name: 'display_format', type: 'varchar', length: 128, nullable: true })
  displayFormat: string | null;

  /**
   * Currency metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Exchange rates for this currency
   */
  @OneToMany(() => ExchangeRate, (rate) => rate.fromCurrency, {
    cascade: false,
    lazy: true,
  })
  exchangeRatesFrom: Promise<ExchangeRate[]> | ExchangeRate[];

  /**
   * Exchange rates to this currency
   */
  @OneToMany(() => ExchangeRate, (rate) => rate.toCurrency, {
    cascade: false,
    lazy: true,
  })
  exchangeRatesTo: Promise<ExchangeRate[]> | ExchangeRate[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Format amount according to currency display format
   */
  formatAmount(amount: number): string {
    const formattedAmount = amount.toFixed(this.decimalPlaces);

    if (this.displayFormat) {
      return this.displayFormat
        .replace('{symbol}', this.symbol || this.code)
        .replace('{amount}', formattedAmount)
        .replace('{code}', this.code);
    }

    // Default format: symbol + amount
    if (this.symbol) {
      return `${this.symbol}${formattedAmount}`;
    }

    return `${formattedAmount} ${this.code}`;
  }

  /**
   * Check if currency is active
   */
  isActive(): boolean {
    return this.status === CurrencyStatus.ACTIVE;
  }
}
