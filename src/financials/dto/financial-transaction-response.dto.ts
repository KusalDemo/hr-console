import {
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
} from '../entities/financial-transaction.entity';
import { TransactionLineItem } from '../entities/transaction-line-item.entity';

/**
 * Transaction Line Item Response DTO
 */
export class TransactionLineItemResponseDto {
  id: number;
  lineNumber: number;
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  description: string | null;
  memo: string | null;
  entityType: string | null;
  entityId: number | null;
  projectId: number | null;

  static fromEntity(item: TransactionLineItem): TransactionLineItemResponseDto {
    const dto = new TransactionLineItemResponseDto();
    dto.id = item.id;
    dto.lineNumber = item.lineNumber;
    dto.accountId = item.accountId;
    dto.debitAmount = item.debitAmount;
    dto.creditAmount = item.creditAmount;
    dto.description = item.description;
    dto.memo = item.memo;
    dto.entityType = item.entityType;
    dto.entityId = item.entityId;
    dto.projectId = item.projectId;
    return dto;
  }
}

/**
 * Financial Transaction Response DTO
 */
export class FinancialTransactionResponseDto {
  id: number;
  transactionNumber: string;
  transactionDate: Date;
  transactionType: TransactionType;
  transactionReference: string | null;
  description: string;
  memo: string | null;
  status: TransactionStatus;
  isReversed: boolean;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  currencyCode: string;
  entityType: string | null;
  entityId: number | null;
  postedAt: Date | null;
  postedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems?: TransactionLineItemResponseDto[];

  static fromEntity(
    transaction: FinancialTransaction,
    includeLineItems = false,
  ): FinancialTransactionResponseDto {
    const dto = new FinancialTransactionResponseDto();
    dto.id = transaction.id;
    dto.transactionNumber = transaction.transactionNumber;
    dto.transactionDate = transaction.transactionDate;
    dto.transactionType = transaction.transactionType;
    dto.transactionReference = transaction.transactionReference;
    dto.description = transaction.description;
    dto.memo = transaction.memo;
    dto.status = transaction.status;
    dto.isReversed = transaction.isReversed;
    dto.totalDebits = transaction.totalDebits;
    dto.totalCredits = transaction.totalCredits;
    dto.isBalanced = transaction.isBalanced;
    dto.currencyCode = transaction.currencyCode;
    dto.entityType = transaction.entityType;
    dto.entityId = transaction.entityId;
    dto.postedAt = transaction.postedAt;
    dto.postedBy = transaction.postedBy;
    dto.createdAt = transaction.createdAt;
    dto.updatedAt = transaction.updatedAt;

    if (includeLineItems && transaction.lineItems) {
      const items = Array.isArray(transaction.lineItems) ? transaction.lineItems : [];
      dto.lineItems = items.map((item) => TransactionLineItemResponseDto.fromEntity(item));
    }

    return dto;
  }
}
