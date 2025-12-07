import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Invoice, InvoiceStatus, InvoiceType } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { RecurringInvoice, RecurringInvoiceStatus } from '../entities/recurring-invoice.entity';

/**
 * Invoice Generation Service
 *
 * Provides automated invoice generation with:
 * - Invoice creation from templates
 * - Recurring invoice generation
 * - Invoice numbering
 * - Invoice delivery
 */
@Injectable()
export class InvoiceGenerationService {
  private readonly logger = new Logger(InvoiceGenerationService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generate invoice from recurring schedule
   */
  async generateInvoiceFromRecurring(
    recurringInvoice: RecurringInvoice,
    invoiceDate?: Date,
  ): Promise<Invoice> {
    const date = invoiceDate || new Date();
    const invoiceNumber = await this.getNextInvoiceNumber();

    // Calculate due date
    const dueDate = recurringInvoice.dueDateDays ? new Date(date) : null;
    if (dueDate && recurringInvoice.dueDateDays) {
      dueDate.setDate(dueDate.getDate() + recurringInvoice.dueDateDays);
    }

    const invoice = this.dataSource.getRepository(Invoice).create({
      invoiceNumber,
      invoiceDate: date,
      dueDate,
      clientId: recurringInvoice.clientId,
      contactId: recurringInvoice.contactId,
      billToContactId: recurringInvoice.billToContactId,
      invoiceType: InvoiceType.STANDARD,
      invoiceStatus: InvoiceStatus.DRAFT,
      subtotal: recurringInvoice.baseSubtotal,
      taxAmount: recurringInvoice.baseTaxAmount,
      totalAmount: recurringInvoice.baseTotalAmount,
      outstandingAmount: recurringInvoice.baseTotalAmount,
      currencyId: recurringInvoice.currencyId,
      currencyCode: recurringInvoice.currencyCode,
      paymentTerms: recurringInvoice.paymentTerms,
      recurringInvoiceId: recurringInvoice.id,
      invoiceTemplateId: recurringInvoice.invoiceTemplateId,
      billingRuleId: recurringInvoice.billingRuleId,
    });

    const saved = await this.dataSource.getRepository(Invoice).save(invoice);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    // Update recurring invoice tracking
    recurringInvoice.totalInvoicesGenerated += 1;
    recurringInvoice.lastInvoiceDate = date;
    recurringInvoice.lastInvoiceId = savedEntity.id;
    await this.dataSource.getRepository(RecurringInvoice).save(recurringInvoice);

    this.logger.log(
      `Generated invoice ${savedEntity.invoiceNumber} from recurring schedule ${recurringInvoice.recurringInvoiceNumber}`,
    );

    return savedEntity;
  }

  /**
   * Generate invoices for due recurring schedules
   */
  async generateRecurringInvoices(date?: Date): Promise<Invoice[]> {
    const checkDate = date || new Date();
    const dateString = checkDate.toISOString().split('T')[0];

    const dueSchedules = await this.dataSource
      .getRepository(RecurringInvoice)
      .createQueryBuilder('recurring')
      .where('recurring.isActive = :isActive', { isActive: true })
      .andWhere('recurring.status = :status', { status: 'ACTIVE' })
      .andWhere('recurring.autoGenerate = :autoGenerate', { autoGenerate: true })
      .andWhere('recurring.nextInvoiceDate <= :date', { date: dateString })
      .getMany();

    const generatedInvoices: Invoice[] = [];

    for (const schedule of dueSchedules) {
      if (schedule.isComplete()) {
        schedule.status = RecurringInvoiceStatus.COMPLETED;
        schedule.isActive = false;
        await this.dataSource.getRepository(RecurringInvoice).save(schedule);
        continue;
      }

      try {
        const invoice = await this.generateInvoiceFromRecurring(schedule, checkDate);

        // Calculate next invoice date
        schedule.nextInvoiceDate = this.calculateNextInvoiceDate(
          schedule.nextInvoiceDate,
          schedule.recurrenceType,
          schedule.recurrenceInterval,
        );

        // Check if recurrence is complete
        if (
          schedule.recurrenceEndDate &&
          schedule.nextInvoiceDate > new Date(schedule.recurrenceEndDate)
        ) {
          schedule.status = RecurringInvoiceStatus.COMPLETED;
          schedule.isActive = false;
        }

        if (
          schedule.recurrenceCount &&
          schedule.totalInvoicesGenerated >= schedule.recurrenceCount
        ) {
          schedule.status = RecurringInvoiceStatus.COMPLETED;
          schedule.isActive = false;
        }

        await this.dataSource.getRepository(RecurringInvoice).save(schedule);

        generatedInvoices.push(invoice);

        // Auto-send if configured
        if (schedule.autoSend) {
          // This would trigger invoice delivery
          this.logger.log(`Auto-send enabled for invoice ${invoice.invoiceNumber}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to generate invoice from recurring schedule ${schedule.recurringInvoiceNumber}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return generatedInvoices;
  }

  /**
   * Calculate next invoice date based on recurrence
   */
  private calculateNextInvoiceDate(
    currentDate: Date,
    recurrenceType: string,
    interval: number,
  ): Date {
    const nextDate = new Date(currentDate);

    switch (recurrenceType) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7 * interval);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3 * interval);
        break;
      case 'YEARLY':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + interval);
    }

    return nextDate;
  }

  /**
   * Get next invoice number
   */
  async getNextInvoiceNumber(prefix = 'INV'): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;

    const lastInvoice = await this.dataSource
      .getRepository(Invoice)
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNumber LIKE :pattern', { pattern })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .limit(1)
      .getOne();

    if (!lastInvoice) {
      return `${prefix}-${year}-001`;
    }

    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2] || '0', 10);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');

    return `${prefix}-${year}-${nextNumber}`;
  }

  /**
   * Send invoice (placeholder for delivery service integration)
   */
  async sendInvoice(invoiceId: number, deliveryMethod = 'EMAIL'): Promise<void> {
    const invoice = await this.dataSource.getRepository(Invoice).findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Update invoice status
    invoice.invoiceStatus = InvoiceStatus.SENT;
    invoice.sentDate = new Date();
    await this.dataSource.getRepository(Invoice).save(invoice);

    this.logger.log(`Sent invoice ${invoice.invoiceNumber} via ${deliveryMethod}`);

    // In a real implementation, this would:
    // 1. Generate invoice PDF
    // 2. Send via email/SMS/portal
    // 3. Log delivery status
  }
}
