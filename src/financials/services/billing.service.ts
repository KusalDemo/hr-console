import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BillingRule, BillingRuleStatus } from '../entities/billing-rule.entity';
import { RecurringInvoice, RecurringInvoiceStatus } from '../entities/recurring-invoice.entity';
import { InvoiceGenerationService } from './invoice-generation.service';

/**
 * Billing Service
 *
 * Manages billing rules and recurring invoices with:
 * - Billing rule management
 * - Recurring invoice schedule management
 * - Automated billing execution
 * - Payment processing integration
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly invoiceGenerationService: InvoiceGenerationService,
  ) {}

  /**
   * Create a billing rule
   */
  async createBillingRule(
    ruleData: Partial<BillingRule>,
    createdBy?: number,
  ): Promise<BillingRule> {
    const rule = this.dataSource.getRepository(BillingRule).create({
      ...ruleData,
      status: ruleData.status || BillingRuleStatus.ACTIVE,
      isActive: ruleData.isActive !== undefined ? ruleData.isActive : true,
      createdBy,
    });

    const saved = await this.dataSource.getRepository(BillingRule).save(rule);

    this.logger.log(`Created billing rule: ${saved.ruleKey}`);

    return saved;
  }

  /**
   * Get billing rule by ID
   */
  async getBillingRuleById(id: number): Promise<BillingRule> {
    const rule = await this.dataSource.getRepository(BillingRule).findOne({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Billing rule with ID ${id} not found`);
    }

    return rule;
  }

  /**
   * Get active billing rules
   */
  async getActiveBillingRules(): Promise<BillingRule[]> {
    return this.dataSource.getRepository(BillingRule).find({
      where: {
        isActive: true,
        status: BillingRuleStatus.ACTIVE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Create a recurring invoice schedule
   */
  async createRecurringInvoice(
    scheduleData: Partial<RecurringInvoice>,
    createdBy?: number,
  ): Promise<RecurringInvoice> {
    const invoiceNumber = await this.getNextRecurringInvoiceNumber();

    const schedule = this.dataSource.getRepository(RecurringInvoice).create({
      ...scheduleData,
      recurringInvoiceNumber: invoiceNumber,
      status: scheduleData.status || RecurringInvoiceStatus.ACTIVE,
      isActive: scheduleData.isActive !== undefined ? scheduleData.isActive : true,
      createdBy,
    });

    const saved = await this.dataSource.getRepository(RecurringInvoice).save(schedule);

    this.logger.log(`Created recurring invoice schedule: ${saved.recurringInvoiceNumber}`);

    return saved;
  }

  /**
   * Get recurring invoice by ID
   */
  async getRecurringInvoiceById(id: number): Promise<RecurringInvoice> {
    const schedule = await this.dataSource.getRepository(RecurringInvoice).findOne({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Recurring invoice with ID ${id} not found`);
    }

    return schedule;
  }

  /**
   * Get active recurring invoices
   */
  async getActiveRecurringInvoices(): Promise<RecurringInvoice[]> {
    return this.dataSource.getRepository(RecurringInvoice).find({
      where: {
        isActive: true,
        status: RecurringInvoiceStatus.ACTIVE,
      },
      order: {
        nextInvoiceDate: 'ASC',
      },
    });
  }

  /**
   * Execute billing for due rules
   */
  async executeBilling(date?: Date): Promise<{ invoicesGenerated: number }> {
    const checkDate = date || new Date();

    // Generate recurring invoices
    const invoices = await this.invoiceGenerationService.generateRecurringInvoices(checkDate);

    this.logger.log(`Executed billing: Generated ${invoices.length} invoices`);

    return {
      invoicesGenerated: invoices.length,
    };
  }

  /**
   * Get next recurring invoice number
   */
  private async getNextRecurringInvoiceNumber(prefix = 'REC'): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;

    const lastSchedule = await this.dataSource
      .getRepository(RecurringInvoice)
      .createQueryBuilder('recurring')
      .where('recurring.recurringInvoiceNumber LIKE :pattern', { pattern })
      .orderBy('recurring.recurringInvoiceNumber', 'DESC')
      .limit(1)
      .getOne();

    if (!lastSchedule) {
      return `${prefix}-${year}-001`;
    }

    const lastNumber = parseInt(lastSchedule.recurringInvoiceNumber.split('-')[2] || '0', 10);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');

    return `${prefix}-${year}-${nextNumber}`;
  }
}
