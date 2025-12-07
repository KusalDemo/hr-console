import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Currency, CurrencyStatus } from '../entities/currency.entity';

/**
 * Currency Repository
 *
 * Custom repository methods for currency queries with organization support.
 */
@Injectable()
export class CurrencyRepository extends Repository<Currency> {
  constructor(private dataSource: DataSource) {
    super(Currency, dataSource.createEntityManager());
  }

  /**
   * Find currency by code
   */
  async findByCode(code: string, includeRelations = false): Promise<Currency | null> {
    const query = this.createQueryBuilder('currency').where('LOWER(currency.code) = LOWER(:code)', {
      code,
    });

    if (includeRelations) {
      query.leftJoinAndSelect('currency.exchangeRatesFrom', 'ratesFrom');
      query.leftJoinAndSelect('currency.exchangeRatesTo', 'ratesTo');
    }

    return query.getOne();
  }

  /**
   * Find currency by ID
   */
  async findById(id: number, includeRelations = false): Promise<Currency | null> {
    const query = this.createQueryBuilder('currency').where('currency.id = :id', { id });

    if (includeRelations) {
      query.leftJoinAndSelect('currency.exchangeRatesFrom', 'ratesFrom');
      query.leftJoinAndSelect('currency.exchangeRatesTo', 'ratesTo');
    }

    return query.getOne();
  }

  /**
   * Find all active currencies
   */
  async findActive(organizationId?: number | null): Promise<Currency[]> {
    const query = this.createQueryBuilder('currency')
      .where('currency.status = :status', { status: CurrencyStatus.ACTIVE })
      .orderBy('currency.code', 'ASC');

    if (organizationId !== undefined) {
      query.andWhere(
        '(currency.organizationId = :organizationId OR currency.organizationId IS NULL)',
        { organizationId },
      );
    } else {
      query.andWhere('currency.organizationId IS NULL');
    }

    return query.getMany();
  }

  /**
   * Find currencies by organization
   */
  async findByOrganization(organizationId: number | null): Promise<Currency[]> {
    const query = this.createQueryBuilder('currency')
      .where('(currency.organizationId = :organizationId OR currency.organizationId IS NULL)', {
        organizationId,
      })
      .orderBy('currency.isDefault', 'DESC')
      .addOrderBy('currency.code', 'ASC');

    return query.getMany();
  }

  /**
   * Find default currency for organization
   */
  async findDefaultCurrency(organizationId?: number | null): Promise<Currency | null> {
    const query = this.createQueryBuilder('currency')
      .where('currency.isDefault = :isDefault', { isDefault: true })
      .andWhere('currency.status = :status', { status: CurrencyStatus.ACTIVE });

    if (organizationId !== undefined) {
      query.andWhere(
        '(currency.organizationId = :organizationId OR currency.organizationId IS NULL)',
        { organizationId },
      );
    } else {
      query.andWhere('currency.organizationId IS NULL');
    }

    return query.orderBy('currency.organizationId', 'DESC').getOne();
  }

  /**
   * Find currencies by status
   */
  async findByStatus(status: CurrencyStatus): Promise<Currency[]> {
    return this.createQueryBuilder('currency')
      .where('currency.status = :status', { status })
      .orderBy('currency.code', 'ASC')
      .getMany();
  }
}
