import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { SupportTicketRepository } from '../repositories';
import { TicketSLA, SLATimeUnit } from '../entities/ticket-sla.entity';
import { SupportTicket, TicketStatus } from '../entities/support-ticket.entity';

/**
 * SLA Tracking Service
 * 
 * Manages SLA tracking and alerts:
 * - Calculate SLA due dates
 * - Monitor SLA compliance
 * - Escalation handling
 * - SLA alerts
 */
@Injectable()
export class SLATrackingService {
  private readonly logger = new Logger(SLATrackingService.name);

  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Apply SLA to ticket
   */
  async applySLAToTicket(ticket: SupportTicket, sla: TicketSLA): Promise<void> {
    const now = new Date();

    // Calculate first response due date
    ticket.firstResponseDueAt = sla.calculateFirstResponseDueDate(now);

    // Calculate resolution due date
    ticket.resolutionDueAt = sla.calculateResolutionDueDate(now);

    // Apply priority overrides if available
    if (sla.priorityOverrides && sla.priorityOverrides[ticket.priority]) {
      const override = sla.priorityOverrides[ticket.priority];
      if (override.firstResponseTime) {
        ticket.firstResponseDueAt = this.calculateDueDate(
          now,
          override.firstResponseTime,
          override.firstResponseTimeUnit || SLATimeUnit.HOURS,
        );
      }
      if (override.resolutionTime) {
        ticket.resolutionDueAt = this.calculateDueDate(
          now,
          override.resolutionTime,
          override.resolutionTimeUnit || SLATimeUnit.HOURS,
        );
      }
    }

    ticket.slaId = sla.id;
    await this.ticketRepository.save(ticket);
  }

  /**
   * Update first response time
   */
  async recordFirstResponse(ticketId: number): Promise<void> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket || ticket.firstResponseAt) {
      return; // Already recorded
    }

    ticket.firstResponseAt = new Date();
    await this.ticketRepository.save(ticket);

    this.logger.log(`First response recorded for ticket ${ticket.ticketNumber}`);
  }

  /**
   * Update resolution time
   */
  async recordResolution(ticketId: number): Promise<void> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket || ticket.resolvedAt) {
      return; // Already recorded
    }

    ticket.resolvedAt = new Date();
    await this.ticketRepository.save(ticket);

    this.logger.log(`Resolution recorded for ticket ${ticket.ticketNumber}`);
  }

  /**
   * Check and handle SLA violations
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkSLAViolations(): Promise<void> {
    this.logger.log('Checking for SLA violations');

    try {
      const overdueTickets = await this.ticketRepository.findOverdueTickets();

      for (const ticket of overdueTickets) {
        await this.handleSLAViolation(ticket);
      }

      this.logger.log(`Processed ${overdueTickets.length} overdue tickets`);
    } catch (error) {
      this.logger.error(`Failed to check SLA violations: ${error.message}`, error);
    }
  }

  /**
   * Handle SLA violation for a ticket
   */
  private async handleSLAViolation(ticket: SupportTicket): Promise<void> {
    // Mark as escalated if not already
    if (!ticket.isEscalated) {
      ticket.isEscalated = true;
      ticket.escalatedAt = new Date();
      ticket.escalationReason = 'SLA violation detected';

      // Apply escalation rules if SLA has them
      if (ticket.slaId) {
        const slaRepo = this.dataSource.getRepository(TicketSLA);
        const sla = await slaRepo.findById(ticket.slaId);
        if (sla?.escalationRules) {
          // TODO: Implement escalation logic based on rules
          // This could include notifying managers, reassigning tickets, etc.
        }
      }

      await this.ticketRepository.save(ticket);
      this.logger.warn(`Ticket ${ticket.ticketNumber} escalated due to SLA violation`);
    }
  }

  /**
   * Calculate due date from time and unit
   */
  private calculateDueDate(startDate: Date, time: number, unit: SLATimeUnit): Date {
    let milliseconds = 0;
    switch (unit) {
      case SLATimeUnit.MINUTES:
        milliseconds = time * 60 * 1000;
        break;
      case SLATimeUnit.HOURS:
        milliseconds = time * 60 * 60 * 1000;
        break;
      case SLATimeUnit.DAYS:
        milliseconds = time * 24 * 60 * 60 * 1000;
        break;
    }
    return new Date(startDate.getTime() + milliseconds);
  }

  /**
   * Get SLA compliance metrics
   */
  async getSLAComplianceMetrics(organizationId?: number): Promise<{
    totalTickets: number;
    firstResponseCompliance: number;
    resolutionCompliance: number;
    averageFirstResponseTime: number;
    averageResolutionTime: number;
    overdueCount: number;
  }> {
    const stats = await this.ticketRepository.getTicketStatistics(organizationId);
    const overdueTickets = await this.ticketRepository.findOverdueTickets();

    // Calculate first response compliance
    const tickets = await this.ticketRepository.findWithPagination(1, 10000, {
      organizationId,
    });

    let firstResponseCompliant = 0;
    let firstResponseTracked = 0;
    let totalFirstResponseTime = 0;
    let resolutionCompliant = 0;
    let resolutionTracked = 0;
    let totalResolutionTime = 0;

    tickets.tickets.forEach((ticket) => {
      // First response metrics
      if (ticket.firstResponseDueAt) {
        firstResponseTracked++;
        if (ticket.firstResponseAt && ticket.firstResponseAt <= ticket.firstResponseDueAt) {
          firstResponseCompliant++;
        }
        if (ticket.firstResponseAt && ticket.createdAt) {
          totalFirstResponseTime +=
            ticket.firstResponseAt.getTime() - ticket.createdAt.getTime();
        }
      }

      // Resolution metrics
      if (ticket.resolutionDueAt) {
        resolutionTracked++;
        if (ticket.resolvedAt && ticket.resolvedAt <= ticket.resolutionDueAt) {
          resolutionCompliant++;
        }
        if (ticket.resolvedAt && ticket.createdAt) {
          totalResolutionTime += ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        }
      }
    });

    return {
      totalTickets: stats.total,
      firstResponseCompliance:
        firstResponseTracked > 0 ? (firstResponseCompliant / firstResponseTracked) * 100 : 0,
      resolutionCompliance:
        resolutionTracked > 0 ? (resolutionCompliant / resolutionTracked) * 100 : 0,
      averageFirstResponseTime:
        firstResponseCompliant > 0
          ? totalFirstResponseTime / firstResponseCompliant / (1000 * 60 * 60)
          : 0, // Hours
      averageResolutionTime:
        resolutionCompliant > 0
          ? totalResolutionTime / resolutionCompliant / (1000 * 60 * 60)
          : 0, // Hours
      overdueCount: overdueTickets.length,
    };
  }
}
