import { Account, AccountType, AccountCategory, NormalBalance } from '../entities/account.entity';

/**
 * Account Response DTO
 */
export class AccountResponseDto {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  accountSubcategory: string | null;
  parentAccountId: number | null;
  accountLevel: number;
  accountPath: string | null;
  isActive: boolean;
  isSystemAccount: boolean;
  isSummaryAccount: boolean;
  normalBalance: NormalBalance;
  openingBalance: number;
  currentBalance: number;
  balanceAsOfDate: Date | null;
  currencyId: number | null;
  currencyCode: string;
  allowsPostings: boolean;
  requiresApproval: boolean;
  reconcileRequired: boolean;
  isBankAccount: boolean;
  isTaxAccount: boolean;
  description: string | null;
  taxCode: string | null;
  costCenterId: number | null;
  departmentId: number | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(account: Account): AccountResponseDto {
    const dto = new AccountResponseDto();
    dto.id = account.id;
    dto.accountNumber = account.accountNumber;
    dto.accountName = account.accountName;
    dto.accountType = account.accountType;
    dto.accountCategory = account.accountCategory;
    dto.accountSubcategory = account.accountSubcategory;
    dto.parentAccountId = account.parentAccountId;
    dto.accountLevel = account.accountLevel;
    dto.accountPath = account.accountPath;
    dto.isActive = account.isActive;
    dto.isSystemAccount = account.isSystemAccount;
    dto.isSummaryAccount = account.isSummaryAccount;
    dto.normalBalance = account.normalBalance;
    dto.openingBalance = account.openingBalance;
    dto.currentBalance = account.currentBalance;
    dto.balanceAsOfDate = account.balanceAsOfDate;
    dto.currencyId = account.currencyId;
    dto.currencyCode = account.currencyCode;
    dto.allowsPostings = account.allowsPostings;
    dto.requiresApproval = account.requiresApproval;
    dto.reconcileRequired = account.reconcileRequired;
    dto.isBankAccount = account.isBankAccount;
    dto.isTaxAccount = account.isTaxAccount;
    dto.description = account.description;
    dto.taxCode = account.taxCode;
    dto.costCenterId = account.costCenterId;
    dto.departmentId = account.departmentId;
    dto.metadata = account.metadata;
    dto.createdAt = account.createdAt;
    dto.updatedAt = account.updatedAt;
    dto.createdBy = account.createdBy;
    dto.updatedBy = account.updatedBy;
    return dto;
  }
}
