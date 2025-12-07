import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
} from '../entities/financial-transaction.entity';

/**
 * Financial Transaction Repository
 *
 * Custom repository methods for financial transaction queries.
 */
@Injectable()
export class FinancialTransactionRepository extends Repository<FinancialTransaction> {
  constructor(private dataSource: DataSource) {
    super(FinancialTransaction, dataSource.createEntityManager());
  }

  /**
   * Find transaction by ID
   */
  async findById(id: number, includeRelations = false): Promise<FinancialTransaction | null> {
    const query = this.createQueryBuilder('transaction').where('transaction.id = :id', { id });

    if (includeRelations) {
      query.leftJoinAndSelect('transaction.lineItems', 'lineItems');
      query.leftJoinAndSelect('lineItems.account', 'account');
      query.leftJoinAndSelect('transaction.currency', 'currency');
    }

    return query.getOne();
  }

  /**
   * Find transaction by transaction number
   */
  async findByTransactionNumber(
    transactionNumber: string,
    includeRelations = false,
  ): Promise<FinancialTransaction | null> {
    const query = this.createQueryBuilder('transaction').where(
      'transaction.transactionNumber = :transactionNumber',
      { transactionNumber },
    );

    if (includeRelations) {
      query.leftJoinAndSelect('transaction.lineItems', 'lineItems');
      query.leftJoinAndSelect('lineItems.account', 'account');
    }

    return query.getOne();
  }

  /**
   * Find transactions by type
   */
  async findByType(transactionType: TransactionType): Promise<FinancialTransaction[]> {
    return this.createQueryBuilder('transaction')
      .where('transaction.transactionType = :transactionType', { transactionType })
      .orderBy('transaction.transactionDate', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find transactions by status
   */
  async findByStatus(status: TransactionStatus): Promise<FinancialTransaction[]> {
    return this.createQueryBuilder('transaction')
      .where('transaction.status = :status', { status })
      .orderBy('transaction.transactionDate', 'DESC')
      .getMany();
  }

  /**
   * Find posted transactions
   */
  async findPosted(): Promise<FinancialTransaction[]> {
    return this.findByStatus(TransactionStatus.POSTED);
  }

  /**
   * Find transactions by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    includeRelations = false,
  ): Promise<FinancialTransaction[]> {
    const query = this.createQueryBuilder('transaction')
      .where('transaction.transactionDate >= :startDate', { startDate })
      .andWhere('transaction.transactionDate <= :endDate', { endDate })
      .orderBy('transaction.transactionDate', 'DESC');

    if (includeRelations) {
      query.leftJoinAndSelect('transaction.lineItems', 'lineItems');
      query.leftJoinAndSelect('lineItems.account', 'account');
    }

    return query.getMany();
  }

  /**
   * Find transactions by account
   */
  async findByAccount(
    accountId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialTransaction[]> {
    const query = this.createQueryBuilder('transaction')
      .innerJoin('transaction.lineItems', 'lineItem')
      .where('lineItem.accountId = :accountId', { accountId })
      .andWhere('transaction.status = :status', { status: TransactionStatus.POSTED })
      .orderBy('transaction.transactionDate', 'DESC');

    if (startDate) {
      query.andWhere('transaction.transactionDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('transaction.transactionDate <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Find transactions by entity
   */
  async findByEntity(entityType: string, entityId: number): Promise<FinancialTransaction[]> {
    return this.createQueryBuilder('transaction')
      .where('transaction.entityType = :entityType', { entityType })
      .andWhere('transaction.entityId = :entityId', { entityId })
      .orderBy('transaction.transactionDate', 'DESC')
      .getMany();
  }

  /**
   * Validate transaction balance (debits = credits)
   */
  async validateBalance(transactionId: number): Promise<boolean> {
    const result = await this.createQueryBuilder('transaction')
      .select('SUM(lineItem.debitAmount)', 'totalDebits')
      .addSelect('SUM(lineItem.creditAmount)', 'totalCredits')
      .innerJoin('transaction.lineItems', 'lineItem')
      .where('transaction.id = :transactionId', { transactionId })
      .getRawOne();

    const totalDebits = parseFloat(result?.totalDebits || '0');
    const totalCredits = parseFloat(result?.totalCredits || '0');

    return totalDebits === totalCredits;
  }

  /**
   * Get next transaction number
   */
  async getNextTransactionNumber(prefix = 'JE'): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;

    const lastTransaction = await this.createQueryBuilder('transaction')
      .where('transaction.transactionNumber LIKE :pattern', { pattern })
      .orderBy('transaction.transactionNumber', 'DESC')
      .limit(1)
      .getOne();

    if (!lastTransaction) {
      return `${prefix}-${year}-001`;
    }

    const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2] || '0', 10);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');

    return `${prefix}-${year}-${nextNumber}`;
  }
}
