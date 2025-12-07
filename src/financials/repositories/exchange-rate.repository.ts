import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExchangeRate, ExchangeRateSource } from '../entities/exchange-rate.entity';

/**
 * Exchange Rate Repository
 *
 * Custom repository methods for exchange rate queries with historical tracking.
 */
@Injectable()
export class ExchangeRateRepository extends Repository<ExchangeRate> {
  constructor(private dataSource: DataSource) {
    super(ExchangeRate, dataSource.createEntityManager());
  }

  /**
   * Find exchange rate by ID
   */
  async findById(id: number, includeRelations = false): Promise<ExchangeRate | null> {
    const query = this.createQueryBuilder('rate').where('rate.id = :id', { id });

    if (includeRelations) {
      query.leftJoinAndSelect('rate.fromCurrency', 'fromCurrency');
      query.leftJoinAndSelect('rate.toCurrency', 'toCurrency');
    }

    return query.getOne();
  }

  /**
   * Find current exchange rate for currency pair
   */
  async findCurrentRate(
    fromCurrencyId: number,
    toCurrencyId: number,
    date?: Date,
    organizationId?: number | null,
  ): Promise<ExchangeRate | null> {
    const checkDate = date || new Date();
    const dateString = checkDate.toISOString().split('T')[0];

    const query = this.createQueryBuilder('rate')
      .where('rate.fromCurrencyId = :fromCurrencyId', { fromCurrencyId })
      .andWhere('rate.toCurrencyId = :toCurrencyId', { toCurrencyId })
      .andWhere('rate.effectiveDate <= :date', { date: dateString })
      .andWhere('(rate.expiryDate IS NULL OR rate.expiryDate >= :date)', { date: dateString })
      .orderBy('rate.effectiveDate', 'DESC')
      .addOrderBy('rate.isDefault', 'DESC')
      .limit(1);

    if (organizationId !== undefined) {
      query.andWhere('(rate.organizationId = :organizationId OR rate.organizationId IS NULL)', {
        organizationId,
      });
      // Prefer organization-specific rates
      query.addOrderBy('rate.organizationId', 'DESC');
    } else {
      query.andWhere('rate.organizationId IS NULL');
    }

    return query.getOne();
  }

  /**
   * Find exchange rate for specific date (historical)
   */
  async findRateForDate(
    fromCurrencyId: number,
    toCurrencyId: number,
    date: Date,
    organizationId?: number | null,
  ): Promise<ExchangeRate | null> {
    const dateString = date.toISOString().split('T')[0];

    const query = this.createQueryBuilder('rate')
      .where('rate.fromCurrencyId = :fromCurrencyId', { fromCurrencyId })
      .andWhere('rate.toCurrencyId = :toCurrencyId', { toCurrencyId })
      .andWhere('rate.effectiveDate <= :date', { date: dateString })
      .andWhere('(rate.expiryDate IS NULL OR rate.expiryDate >= :date)', { date: dateString })
      .orderBy('rate.effectiveDate', 'DESC')
      .addOrderBy('rate.isDefault', 'DESC')
      .limit(1);

    if (organizationId !== undefined) {
      query.andWhere('(rate.organizationId = :organizationId OR rate.organizationId IS NULL)', {
        organizationId,
      });
      query.addOrderBy('rate.organizationId', 'DESC');
    } else {
      query.andWhere('rate.organizationId IS NULL');
    }

    return query.getOne();
  }

  /**
   * Find all rates for currency pair
   */
  async findByCurrencyPair(
    fromCurrencyId: number,
    toCurrencyId: number,
    organizationId?: number | null,
  ): Promise<ExchangeRate[]> {
    const query = this.createQueryBuilder('rate')
      .where('rate.fromCurrencyId = :fromCurrencyId', { fromCurrencyId })
      .andWhere('rate.toCurrencyId = :toCurrencyId', { toCurrencyId })
      .orderBy('rate.effectiveDate', 'DESC');

    if (organizationId !== undefined) {
      query.andWhere('(rate.organizationId = :organizationId OR rate.organizationId IS NULL)', {
        organizationId,
      });
    } else {
      query.andWhere('rate.organizationId IS NULL');
    }

    return query.getMany();
  }

  /**
   * Find rates by currency (all pairs involving this currency)
   */
  async findByCurrency(
    currencyId: number,
    organizationId?: number | null,
  ): Promise<ExchangeRate[]> {
    const query = this.createQueryBuilder('rate')
      .where('(rate.fromCurrencyId = :currencyId OR rate.toCurrencyId = :currencyId)', {
        currencyId,
      })
      .orderBy('rate.effectiveDate', 'DESC');

    if (organizationId !== undefined) {
      query.andWhere('(rate.organizationId = :organizationId OR rate.organizationId IS NULL)', {
        organizationId,
      });
    } else {
      query.andWhere('rate.organizationId IS NULL');
    }

    return query.getMany();
  }

  /**
   * Find rates by source
   */
  async findBySource(source: ExchangeRateSource): Promise<ExchangeRate[]> {
    return this.createQueryBuilder('rate')
      .where('rate.source = :source', { source })
      .orderBy('rate.effectiveDate', 'DESC')
      .getMany();
  }

  /**
   * Find rates effective on date
   */
  async findRatesEffectiveOnDate(
    date: Date,
    organizationId?: number | null,
  ): Promise<ExchangeRate[]> {
    const dateString = date.toISOString().split('T')[0];

    const query = this.createQueryBuilder('rate')
      .where('rate.effectiveDate <= :date', { date: dateString })
      .andWhere('(rate.expiryDate IS NULL OR rate.expiryDate >= :date)', { date: dateString })
      .orderBy('rate.effectiveDate', 'DESC');

    if (organizationId !== undefined) {
      query.andWhere('(rate.organizationId = :organizationId OR rate.organizationId IS NULL)', {
        organizationId,
      });
    } else {
      query.andWhere('rate.organizationId IS NULL');
    }

    return query.getMany();
  }

  /**
   * Get latest rates for all currency pairs
   */
  async findLatestRates(organizationId?: number | null): Promise<ExchangeRate[]> {
    // Use raw query for better performance with DISTINCT ON
    const query = `
      SELECT DISTINCT ON (from_currency_id, to_currency_id) *
      FROM exchange_rates
      WHERE (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        AND effective_date <= CURRENT_DATE
        ${
          organizationId !== undefined
            ? `AND (organization_id = $1 OR organization_id IS NULL)`
            : `AND organization_id IS NULL`
        }
      ORDER BY from_currency_id, to_currency_id, effective_date DESC, is_default DESC
      ${organizationId !== undefined ? `, organization_id DESC NULLS LAST` : ''}
    `;

    const params = organizationId !== undefined ? [organizationId] : [];

    const result = await this.query(query, params);
    return result.map((row: any) => this.create(row));
  }
}
