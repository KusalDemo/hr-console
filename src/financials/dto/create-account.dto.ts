import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType, AccountCategory, NormalBalance } from '../entities/account.entity';

/**
 * Create Account DTO
 */
export class CreateAccountDto {
  @IsString()
  @Length(1, 64)
  accountNumber: string;

  @IsString()
  accountName: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  @IsEnum(AccountCategory)
  accountCategory: AccountCategory;

  @IsOptional()
  @IsString()
  accountSubcategory?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentAccountId?: number | null;

  @IsOptional()
  @IsEnum(NormalBalance)
  normalBalance?: NormalBalance;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  openingBalance?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currencyId?: number | null;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  allowsPostings?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  reconcileRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isBankAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isTaxAccount?: boolean;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  taxCode?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costCenterId?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
