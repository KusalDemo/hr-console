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

/**
 * Exchange Rate Source Enum
 */
export enum ExchangeRateSource {
  MANUAL = 'MANUAL', // Manually entered
  API = 'API', // From external API
  IMPORT = 'IMPORT', // Imported from file
  CALCULATED = 'CALCULATED', // Calculated from other rates
}

/**
 * Exchange Rate Entity
 *
 * Represents exchange rates between currencies with:
 * - Historical rate tracking (effective dates)
 * - Rate source tracking (manual, API, import)
 * - Bid/ask rates for buy/sell operations
 * - Organization-specific rates
 * - Support for real-time and historical conversions
 */
@Entity('exchange_rates')
@Index('idx_exchange_rates_from_currency', ['fromCurrencyId'])
@Index('idx_exchange_rates_to_currency', ['toCurrencyId'])
@Index('idx_exchange_rates_effective_date', ['effectiveDate'])
@Index('idx_exchange_rates_organization', ['organizationId'])
@Index('idx_exchange_rates_currency_pair', ['fromCurrencyId', 'toCurrencyId', 'effectiveDate'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Source currency
   */
  @ManyToOne(() => Currency, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'from_currency_id' })
  fromCurrency: Currency;

  @Column({ name: 'from_currency_id', type: 'bigint', nullable: false })
  fromCurrencyId: number;

  /**
   * Target currency
   */
  @ManyToOne(() => Currency, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_currency_id' })
  toCurrency: Currency;

  @Column({ name: 'to_currency_id', type: 'bigint', nullable: false })
  toCurrencyId: number;

  /**
   * Exchange rate (1 unit of from_currency = rate units of to_currency)
   */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: false,
  })
  rate: number;

  /**
   * Bid rate (for buying to_currency with from_currency)
   */
  @Column({
    name: 'bid_rate',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  bidRate: number | null;

  /**
   * Ask rate (for selling to_currency for from_currency)
   */
  @Column({
    name: 'ask_rate',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  askRate: number | null;

  /**
   * Effective date for this exchange rate
   */
  @Column({ name: 'effective_date', type: 'date', nullable: false })
  effectiveDate: Date;

  /**
   * Expiry date for this exchange rate (null if current/indefinite)
   */
  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  /**
   * Rate source
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ExchangeRateSource.MANUAL,
  })
  source: ExchangeRateSource;

  /**
   * Organization this rate is associated with (null for global rates)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Whether this is the default rate for the currency pair
   */
  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  /**
   * Notes/description
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Exchange rate metadata (JSONB for additional flexible data)
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
   * Check if rate is currently effective
   */
  isEffective(date?: Date): boolean {
    const checkDate = date || new Date();
    const effectiveDate = new Date(this.effectiveDate);
    effectiveDate.setHours(0, 0, 0, 0);

    const checkDateOnly = new Date(checkDate);
    checkDateOnly.setHours(0, 0, 0, 0);

    if (checkDateOnly < effectiveDate) {
      return false;
    }

    if (this.expiryDate) {
      const expiryDateOnly = new Date(this.expiryDate);
      expiryDateOnly.setHours(0, 0, 0, 0);
      return checkDateOnly <= expiryDateOnly;
    }

    return true;
  }

  /**
   * Convert amount from source currency to target currency
   */
  convert(amount: number, useBidAsk = false): number {
    if (useBidAsk) {
      // For buying to_currency, use bid rate
      // For selling to_currency, use ask rate
      // Default to ask rate (selling)
      const conversionRate = this.askRate || this.rate;
      return amount * conversionRate;
    }

    return amount * this.rate;
  }

  /**
   * Get inverse rate (to_currency to from_currency)
   */
  getInverseRate(): number {
    if (this.rate === 0) {
      return 0;
    }
    return 1 / this.rate;
  }
}
