import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountRepository, FinancialTransactionRepository } from '../repositories';
import { Account, AccountType, AccountCategory, NormalBalance } from '../entities/account.entity';
import {
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
} from '../entities/financial-transaction.entity';
import { TransactionLineItem } from '../entities/transaction-line-item.entity';

/**
 * Accounting Service
 *
 * Manages double-entry bookkeeping with:
 * - Journal entry creation and validation
 * - Transaction posting and balance updates
 * - Account balance calculations
 * - Transaction reversal
 * - Double-entry validation (debits = credits)
 */
@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: FinancialTransactionRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a journal entry with line items
   */
  async createJournalEntry(
    transactionDate: Date,
    description: string,
    lineItems: Array<{
      accountId: number;
      debitAmount?: number;
      creditAmount?: number;
      description?: string;
      memo?: string;
      entityType?: string;
      entityId?: number;
      projectId?: number;
    }>,
    memo?: string,
    createdBy?: number,
  ): Promise<FinancialTransaction> {
    // Validate line items
    this.validateLineItems(lineItems);

    // Create transaction
    const transactionNumber = await this.transactionRepository.getNextTransactionNumber('JE');

    const transaction = this.transactionRepository.create({
      transactionNumber,
      transactionDate,
      transactionType: TransactionType.JOURNAL_ENTRY,
      description,
      memo,
      status: TransactionStatus.DRAFT,
      currencyCode: 'USD',
      totalDebits: 0,
      totalCredits: 0,
      isBalanced: false,
      createdBy,
    });

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;

    // Create line items
    const transactionLineItems = lineItems.map((item, index) => {
      const debitAmount = item.debitAmount || 0;
      const creditAmount = item.creditAmount || 0;

      totalDebits += debitAmount;
      totalCredits += creditAmount;

      return this.dataSource.getRepository(TransactionLineItem).create({
        transaction,
        lineNumber: index + 1,
        accountId: item.accountId,
        debitAmount,
        creditAmount,
        description: item.description,
        memo: item.memo,
        entityType: item.entityType,
        entityId: item.entityId,
        projectId: item.projectId,
      });
    });

    // Validate balance
    if (totalDebits !== totalCredits) {
      throw new BadRequestException(
        `Transaction is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }

    transaction.totalDebits = totalDebits;
    transaction.totalCredits = totalCredits;
    transaction.isBalanced = true;

    // Save transaction with line items
    const savedTransaction = await this.transactionRepository.save(transaction);
    await this.dataSource.getRepository(TransactionLineItem).save(transactionLineItems);

    this.logger.log(`Created journal entry: ${savedTransaction.transactionNumber}`);

    return savedTransaction;
  }

  /**
   * Post a transaction (make it final)
   */
  async postTransaction(transactionId: number, postedBy?: number): Promise<FinancialTransaction> {
    const transaction = await this.transactionRepository.findById(transactionId, true);

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    if (transaction.status !== TransactionStatus.DRAFT) {
      throw new BadRequestException(
        `Transaction ${transaction.transactionNumber} is already ${transaction.status}`,
      );
    }

    // Validate balance
    const isBalanced = await this.transactionRepository.validateBalance(transactionId);
    if (!isBalanced) {
      throw new BadRequestException(
        `Transaction ${transaction.transactionNumber} is not balanced and cannot be posted`,
      );
    }

    // Update transaction status
    transaction.status = TransactionStatus.POSTED;
    transaction.postedAt = new Date();
    transaction.postedBy = postedBy ?? null;

    const saved = await this.transactionRepository.save(transaction);

    // Update account balances
    await this.updateAccountBalances(transaction);

    this.logger.log(`Posted transaction: ${saved.transactionNumber}`);

    return saved;
  }

  /**
   * Reverse a transaction
   */
  async reverseTransaction(
    transactionId: number,
    reversalDate: Date,
    description?: string,
    createdBy?: number,
  ): Promise<FinancialTransaction> {
    const originalTransaction = await this.transactionRepository.findById(transactionId, true);

    if (!originalTransaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    if (originalTransaction.status !== TransactionStatus.POSTED) {
      throw new BadRequestException('Only posted transactions can be reversed');
    }

    if (originalTransaction.isReversed) {
      throw new BadRequestException('Transaction is already reversed');
    }

    // Create reversal transaction
    const reversalNumber = await this.transactionRepository.getNextTransactionNumber('REV');

    const reversalTransaction = this.transactionRepository.create({
      transactionNumber: reversalNumber,
      transactionDate: reversalDate,
      transactionType: originalTransaction.transactionType,
      description: description || `Reversal of ${originalTransaction.transactionNumber}`,
      status: TransactionStatus.DRAFT,
      currencyCode: originalTransaction.currencyCode,
      totalDebits: originalTransaction.totalCredits, // Reversed
      totalCredits: originalTransaction.totalDebits, // Reversed
      isBalanced: true,
      reversedTransactionId: originalTransaction.id,
      createdBy,
    });

    const savedReversal = await this.transactionRepository.save(reversalTransaction);

    // Create reversed line items
    const lineItems = await this.dataSource
      .getRepository(TransactionLineItem)
      .find({ where: { transactionId: originalTransaction.id } });

    const reversedLineItems = lineItems.map((item, index) => {
      return this.dataSource.getRepository(TransactionLineItem).create({
        transaction: savedReversal,
        lineNumber: index + 1,
        accountId: item.accountId,
        debitAmount: item.creditAmount, // Reversed
        creditAmount: item.debitAmount, // Reversed
        description: item.description,
        memo: item.memo,
        entityType: item.entityType,
        entityId: item.entityId,
        projectId: item.projectId,
      });
    });

    await this.dataSource.getRepository(TransactionLineItem).save(reversedLineItems);

    // Post reversal transaction
    await this.postTransaction(savedReversal.id, createdBy);

    // Mark original as reversed
    originalTransaction.isReversed = true;
    originalTransaction.reversalTransactionId = savedReversal.id;
    originalTransaction.status = TransactionStatus.REVERSED;
    await this.transactionRepository.save(originalTransaction);

    this.logger.log(
      `Reversed transaction: ${originalTransaction.transactionNumber} with ${savedReversal.transactionNumber}`,
    );

    return savedReversal;
  }

  /**
   * Update account balances after transaction posting
   */
  private async updateAccountBalances(transaction: FinancialTransaction): Promise<void> {
    const lineItems = await this.dataSource
      .getRepository(TransactionLineItem)
      .find({ where: { transactionId: transaction.id } });

    for (const lineItem of lineItems) {
      const account = await this.accountRepository.findById(lineItem.accountId);

      if (!account) {
        continue;
      }

      // Calculate new balance based on normal balance
      let balanceChange = 0;
      if (account.normalBalance === NormalBalance.DEBIT) {
        balanceChange = lineItem.debitAmount - lineItem.creditAmount;
      } else {
        balanceChange = lineItem.creditAmount - lineItem.debitAmount;
      }

      account.currentBalance = account.currentBalance + balanceChange;
      account.balanceAsOfDate = transaction.transactionDate;

      await this.accountRepository.save(account);
    }
  }

  /**
   * Calculate account balance as of a specific date
   */
  async calculateAccountBalance(accountId: number, asOfDate: Date): Promise<number> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    // Get all posted transactions for this account up to the date
    const transactions = await this.transactionRepository.findByAccount(
      accountId,
      undefined,
      asOfDate,
    );

    let balance = account.openingBalance;

    for (const transaction of transactions) {
      const lineItems = await this.dataSource.getRepository(TransactionLineItem).find({
        where: {
          transactionId: transaction.id,
          accountId: account.id,
        },
      });

      for (const lineItem of lineItems) {
        if (account.normalBalance === NormalBalance.DEBIT) {
          balance += lineItem.debitAmount - lineItem.creditAmount;
        } else {
          balance += lineItem.creditAmount - lineItem.debitAmount;
        }
      }
    }

    return balance;
  }

  /**
   * Validate line items
   */
  private validateLineItems(
    lineItems: Array<{
      accountId: number;
      debitAmount?: number;
      creditAmount?: number;
    }>,
  ): void {
    if (lineItems.length < 2) {
      throw new BadRequestException('Transaction must have at least 2 line items');
    }

    for (const item of lineItems) {
      const hasDebit = (item.debitAmount || 0) > 0;
      const hasCredit = (item.creditAmount || 0) > 0;

      if (!hasDebit && !hasCredit) {
        throw new BadRequestException('Each line item must have either a debit or credit amount');
      }

      if (hasDebit && hasCredit) {
        throw new BadRequestException('Line item cannot have both debit and credit amounts');
      }

      // Validate account exists and allows postings
      // This would be checked in the actual implementation
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number): Promise<FinancialTransaction> {
    const transaction = await this.transactionRepository.findById(id, true);

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialTransaction[]> {
    return this.transactionRepository.findByDateRange(startDate, endDate, true);
  }
}
