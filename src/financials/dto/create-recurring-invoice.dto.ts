import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurrenceType, RecurringInvoiceStatus } from '../entities/recurring-invoice.entity';

/**
 * Create Recurring Invoice DTO
 */
export class CreateRecurringInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceTemplateId?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  billingRuleId?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  contactId?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  billToContactId?: number | null;

  @IsEnum(RecurrenceType)
  recurrenceType: RecurrenceType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  recurrenceInterval?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceDay?: number | null;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceCount?: number | null;

  @IsDateString()
  nextInvoiceDate: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  baseSubtotal?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  baseTaxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  baseTotalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currencyId?: number | null;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dueDateDays?: number | null;

  @IsOptional()
  @IsEnum(RecurringInvoiceStatus)
  status?: RecurringInvoiceStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSend?: boolean;

  @IsOptional()
  @IsBoolean()
  sendReminders?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reminderDaysBeforeDue?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
