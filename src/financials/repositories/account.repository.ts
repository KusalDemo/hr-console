import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Account, AccountType, AccountCategory } from '../entities/account.entity';

/**
 * Account Repository
 * 
 * Custom repository methods for account queries with hierarchy support.
 */
@Injectable()
export class AccountRepository extends Repository<Account> {
  constructor(private dataSource: DataSource) {
    super(Account, dataSource.createEntityManager());
  }

  /**
   * Find account by ID
   */
  async findById(id: number, includeRelations = false): Promise<Account | null> {
    const query = this.createQueryBuilder('account').where('account.id = :id', { id });

    if (includeRelations) {
      query.leftJoinAndSelect('account.currency', 'currency');
      query.leftJoinAndSelect('account.parentAccount', 'parentAccount');
    }

    return query.getOne();
  }

  /**
   * Find account by account number
   */
  async findByAccountNumber(
    accountNumber: string,
    includeRelations = false,
  ): Promise<Account | null> {
    const query = this.createQueryBuilder('account')
      .where('account.accountNumber = :accountNumber', { accountNumber });

    if (includeRelations) {
      query.leftJoinAndSelect('account.currency', 'currency');
      query.leftJoinAndSelect('account.parentAccount', 'parentAccount');
    }

    return query.getOne();
  }

  /**
   * Find accounts by type
   */
  async findByType(accountType: AccountType): Promise<Account[]> {
    return this.createQueryBuilder('account')
      .where('account.accountType = :accountType', { accountType })
      .andWhere('account.isActive = :isActive', { isActive: true })
      .orderBy('account.accountNumber', 'ASC')
      .getMany();
  }

  /**
   * Find accounts by category
   */
  async findByCategory(category: AccountCategory): Promise<Account[]> {
    return this.createQueryBuilder('account')
      .where('account.accountCategory = :category', { category })
      .andWhere('account.isActive = :isActive', { isActive: true })
      .orderBy('account.accountNumber', 'ASC')
      .getMany();
  }

  /**
   * Find active accounts
   */
  async findActive(): Promise<Account[]> {
    return this.createQueryBuilder('account')
      .where('account.isActive = :isActive', { isActive: true })
      .orderBy('account.accountNumber', 'ASC')
      .getMany();
  }

  /**
   * Find accounts by parent
   */
  async findByParent(parentAccountId: number): Promise<Account[]> {
    return this.createQueryBuilder('account')
      .where('account.parentAccountId = :parentAccountId', { parentAccountId })
      .orderBy('account.accountNumber', 'ASC')
      .getMany();
  }

  /**
   * Find top-level accounts
   */
  async findTopLevel(): Promise<Account[]> {
    return this.createQueryBuilder('account')
      .where('account.parentAccountId IS NULL')
      .andWhere('account.isActive = :isActive', { isActive: true })
      .orderBy('account.accountNumber', 'ASC')
      .getMany();
  }

  /**
   * Get account hierarchy (all descendants)
   */
  async getAccountHierarchy(accountId: number): Promise<Account[]> {
    const account = await this.findById(accountId);
    if (!account) {
      return [];
    }

    const path = account.accountPath || account.id.toString();
    return this.createQueryBuilder('account')
      .where('account.accountPath LIKE :path', { path: `${path}%` })
      .orWhere('account.id = :id', { id: accountId })
      .orderBy('account.accountPath', 'ASC')
      .getMany();
  }

  /**
   * Get account balance summary
   */
  async getAccountBalanceSummary(accountId: number, asOfDate?: Date): Promise<{
    accountId: number;
    openingBalance: number;
    currentBalance: number;
    debitTotal: number;
    creditTotal: number;
    netBalance: number;
  }> {
    const account = await this.findById(accountId);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    // This would typically use a more complex query with transaction line items
    // For now, return basic balance info
    return {
      accountId: account.id,
      openingBalance: account.openingBalance,
      currentBalance: account.currentBalance,
      debitTotal: 0, // Would be calculated from transaction_line_items
      creditTotal: 0, // Would be calculated from transaction_line_items
      netBalance: account.getNetBalance(),
    };
  }
}
