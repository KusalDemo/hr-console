import { Injectable, Logger } from '@nestjs/common';
import { AccountRepository, FinancialTransactionRepository } from '../repositories';
import { AccountType, AccountCategory } from '../entities/account.entity';
import { AccountingService } from './accounting.service';

/**
 * Financial Reporting Service
 *
 * Provides financial reports with:
 * - Profit & Loss (Income Statement)
 * - Balance Sheet
 * - Trial Balance
 * - Account aging reports
 * - Financial summaries
 */
@Injectable()
export class FinancialReportingService {
  private readonly logger = new Logger(FinancialReportingService.name);

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: FinancialTransactionRepository,
    private readonly accountingService: AccountingService,
  ) {}

  /**
   * Generate Profit & Loss (Income Statement)
   */
  async generateProfitAndLoss(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { startDate: Date; endDate: Date };
    revenue: {
      total: number;
      accounts: Array<{ accountId: number; accountName: string; amount: number }>;
    };
    expenses: {
      total: number;
      accounts: Array<{ accountId: number; accountName: string; amount: number }>;
    };
    netIncome: number;
  }> {
    // Get revenue accounts
    const revenueAccounts = await this.accountRepository.findByCategory(AccountCategory.REVENUE);
    const revenueAmounts = await Promise.all(
      revenueAccounts.map(async (account) => {
        const startBalance = await this.accountingService.calculateAccountBalance(
          account.id,
          startDate,
        );
        const endBalance = await this.accountingService.calculateAccountBalance(
          account.id,
          endDate,
        );
        return {
          accountId: account.id,
          accountName: account.accountName,
          amount: endBalance - startBalance,
        };
      }),
    );

    // Get expense accounts
    const expenseAccounts = await this.accountRepository.findByCategory(
      AccountCategory.OPERATING_EXPENSE,
    );
    const expenseAmounts = await Promise.all(
      expenseAccounts.map(async (account) => {
        const startBalance = await this.accountingService.calculateAccountBalance(
          account.id,
          startDate,
        );
        const endBalance = await this.accountingService.calculateAccountBalance(
          account.id,
          endDate,
        );
        return {
          accountId: account.id,
          accountName: account.accountName,
          amount: endBalance - startBalance,
        };
      }),
    );

    const totalRevenue = revenueAmounts.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenseAmounts.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      period: { startDate, endDate },
      revenue: {
        total: totalRevenue,
        accounts: revenueAmounts.filter((item) => item.amount !== 0),
      },
      expenses: {
        total: totalExpenses,
        accounts: expenseAmounts.filter((item) => item.amount !== 0),
      },
      netIncome,
    };
  }

  /**
   * Generate Balance Sheet
   */
  async generateBalanceSheet(asOfDate: Date): Promise<{
    asOfDate: Date;
    assets: {
      current: {
        total: number;
        accounts: Array<{ accountId: number; accountName: string; balance: number }>;
      };
      fixed: {
        total: number;
        accounts: Array<{ accountId: number; accountName: string; balance: number }>;
      };
      total: number;
    };
    liabilities: {
      current: {
        total: number;
        accounts: Array<{ accountId: number; accountName: string; balance: number }>;
      };
      longTerm: {
        total: number;
        accounts: Array<{ accountId: number; accountName: string; balance: number }>;
      };
      total: number;
    };
    equity: {
      total: number;
      accounts: Array<{ accountId: number; accountName: string; balance: number }>;
    };
    totalLiabilitiesAndEquity: number;
  }> {
    // Get asset accounts
    const currentAssetAccounts = await this.accountRepository.findByCategory(
      AccountCategory.CURRENT_ASSET,
    );
    const fixedAssetAccounts = await this.accountRepository.findByCategory(
      AccountCategory.FIXED_ASSET,
    );

    const currentAssetBalances = await Promise.all(
      currentAssetAccounts.map(async (account) => ({
        accountId: account.id,
        accountName: account.accountName,
        balance: await this.accountingService.calculateAccountBalance(account.id, asOfDate),
      })),
    );

    const fixedAssetBalances = await Promise.all(
      fixedAssetAccounts.map(async (account) => ({
        accountId: account.id,
        accountName: account.accountName,
        balance: await this.accountingService.calculateAccountBalance(account.id, asOfDate),
      })),
    );

    // Get liability accounts
    const currentLiabilityAccounts = await this.accountRepository.findByCategory(
      AccountCategory.CURRENT_LIABILITY,
    );
    const longTermLiabilityAccounts = await this.accountRepository.findByCategory(
      AccountCategory.LONG_TERM_LIABILITY,
    );

    const currentLiabilityBalances = await Promise.all(
      currentLiabilityAccounts.map(async (account) => ({
        accountId: account.id,
        accountName: account.accountName,
        balance: await this.accountingService.calculateAccountBalance(account.id, asOfDate),
      })),
    );

    const longTermLiabilityBalances = await Promise.all(
      longTermLiabilityAccounts.map(async (account) => ({
        accountId: account.id,
        accountName: account.accountName,
        balance: await this.accountingService.calculateAccountBalance(account.id, asOfDate),
      })),
    );

    // Get equity accounts
    const equityAccounts = await this.accountRepository.findByCategory(AccountCategory.EQUITY);
    const equityBalances = await Promise.all(
      equityAccounts.map(async (account) => ({
        accountId: account.id,
        accountName: account.accountName,
        balance: await this.accountingService.calculateAccountBalance(account.id, asOfDate),
      })),
    );

    const totalCurrentAssets = currentAssetBalances.reduce((sum, item) => sum + item.balance, 0);
    const totalFixedAssets = fixedAssetBalances.reduce((sum, item) => sum + item.balance, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalCurrentLiabilities = currentLiabilityBalances.reduce(
      (sum, item) => sum + item.balance,
      0,
    );
    const totalLongTermLiabilities = longTermLiabilityBalances.reduce(
      (sum, item) => sum + item.balance,
      0,
    );
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const totalEquity = equityBalances.reduce((sum, item) => sum + item.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      asOfDate,
      assets: {
        current: {
          total: totalCurrentAssets,
          accounts: currentAssetBalances,
        },
        fixed: {
          total: totalFixedAssets,
          accounts: fixedAssetBalances,
        },
        total: totalAssets,
      },
      liabilities: {
        current: {
          total: totalCurrentLiabilities,
          accounts: currentLiabilityBalances,
        },
        longTerm: {
          total: totalLongTermLiabilities,
          accounts: longTermLiabilityBalances,
        },
        total: totalLiabilities,
      },
      equity: {
        total: totalEquity,
        accounts: equityBalances,
      },
      totalLiabilitiesAndEquity,
    };
  }

  /**
   * Generate Trial Balance
   */
  async generateTrialBalance(asOfDate: Date): Promise<{
    asOfDate: Date;
    accounts: Array<{
      accountId: number;
      accountNumber: string;
      accountName: string;
      debitBalance: number;
      creditBalance: number;
      netBalance: number;
    }>;
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  }> {
    const accounts = await this.accountRepository.findActive();

    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.accountingService.calculateAccountBalance(account.id, asOfDate);

        let debitBalance = 0;
        let creditBalance = 0;

        if (account.normalBalance === 'DEBIT') {
          debitBalance = balance > 0 ? balance : 0;
          creditBalance = balance < 0 ? Math.abs(balance) : 0;
        } else {
          creditBalance = balance > 0 ? balance : 0;
          debitBalance = balance < 0 ? Math.abs(balance) : 0;
        }

        return {
          accountId: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          debitBalance,
          creditBalance,
          netBalance: balance,
        };
      }),
    );

    const totalDebits = accountBalances.reduce((sum, item) => sum + item.debitBalance, 0);
    const totalCredits = accountBalances.reduce((sum, item) => sum + item.creditBalance, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow small rounding differences

    return {
      asOfDate,
      accounts: accountBalances.filter(
        (item) => item.debitBalance !== 0 || item.creditBalance !== 0,
      ),
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }

  /**
   * Get account summary
   */
  async getAccountSummary(accountId: number, startDate?: Date, endDate?: Date) {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    const asOfDate = endDate || new Date();
    const balance = await this.accountingService.calculateAccountBalance(accountId, asOfDate);

    const transactions = await this.transactionRepository.findByAccount(
      accountId,
      startDate,
      endDate,
    );

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        accountCategory: account.accountCategory,
      },
      period: {
        startDate: startDate || account.balanceAsOfDate || new Date(),
        endDate: asOfDate,
      },
      openingBalance: account.openingBalance,
      currentBalance: balance,
      transactionCount: transactions.length,
      transactions: transactions.slice(0, 10), // Last 10 transactions
    };
  }
}
