import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan, IsNull } from 'typeorm';
import { SupportTicket, TicketStatus, TicketPriority } from '../entities/support-ticket.entity';

/**
 * Support Ticket Repository
 * Provides custom queries for support ticket operations
 */
@Injectable()
export class SupportTicketRepository extends Repository<SupportTicket> {
  constructor(private dataSource: DataSource) {
    super(SupportTicket, dataSource.createEntityManager());
  }

  /**
   * Find ticket by ID
   */
  async findById(id: number, includeRelations = false): Promise<SupportTicket | null> {
    const query = this.createQueryBuilder('ticket').where('ticket.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('ticket.category', 'category')
        .leftJoinAndSelect('ticket.organization', 'organization')
        .leftJoinAndSelect('ticket.requester', 'requester')
        .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
        .leftJoinAndSelect('ticket.sla', 'sla');
    }

    return query.getOne();
  }

  /**
   * Find ticket by ticket number
   */
  async findByTicketNumber(ticketNumber: string): Promise<SupportTicket | null> {
    return this.findOne({
      where: { ticketNumber },
      relations: ['category', 'organization', 'requester', 'assignedTo', 'sla'],
    });
  }

  /**
   * Find tickets by status
   */
  async findByStatus(status: TicketStatus): Promise<SupportTicket[]> {
    return this.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find tickets by assignee
   */
  async findByAssignee(assignedToId: number): Promise<SupportTicket[]> {
    return this.find({
      where: { assignedToId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find tickets by requester
   */
  async findByRequester(requesterId: number): Promise<SupportTicket[]> {
    return this.find({
      where: { requesterId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find tickets with pagination and filters
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      categoryId?: number;
      organizationId?: number;
      assignedToId?: number;
      requesterId?: number;
      isEscalated?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    const query = this.createQueryBuilder('ticket');

    if (filters?.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }

    if (filters?.categoryId !== undefined) {
      query.andWhere('ticket.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters?.organizationId !== undefined) {
      query.andWhere('ticket.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.assignedToId !== undefined) {
      query.andWhere('ticket.assignedToId = :assignedToId', {
        assignedToId: filters.assignedToId,
      });
    }

    if (filters?.requesterId !== undefined) {
      query.andWhere('ticket.requesterId = :requesterId', { requesterId: filters.requesterId });
    }

    if (filters?.isEscalated !== undefined) {
      query.andWhere('ticket.isEscalated = :isEscalated', { isEscalated: filters.isEscalated });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters?.startDate) {
      query.andWhere('ticket.createdAt >= :startDate', { startDate: filters.startDate });
    } else if (filters?.endDate) {
      query.andWhere('ticket.createdAt <= :endDate', { endDate: filters.endDate });
    }

    query
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tickets, total] = await query.getManyAndCount();

    return { tickets, total };
  }

  /**
   * Find tickets with overdue SLA
   */
  async findOverdueTickets(): Promise<SupportTicket[]> {
    const now = new Date();
    return this.find({
      where: [
        {
          firstResponseDueAt: LessThan(now),
          firstResponseAt: IsNull(),
          status: In([
            TicketStatus.OPEN,
            TicketStatus.ASSIGNED,
            TicketStatus.IN_PROGRESS,
            TicketStatus.WAITING_CUSTOMER,
          ]),
        },
        {
          resolutionDueAt: LessThan(now),
          resolvedAt: IsNull(),
          status: In([
            TicketStatus.OPEN,
            TicketStatus.ASSIGNED,
            TicketStatus.IN_PROGRESS,
            TicketStatus.WAITING_CUSTOMER,
          ]),
        },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(organizationId?: number): Promise<{
    total: number;
    open: number;
    closed: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number;
    slaCompliance: number;
  }> {
    const query = this.createQueryBuilder('ticket');

    if (organizationId !== undefined) {
      query.andWhere('ticket.organizationId = :organizationId', { organizationId });
    }

    const tickets = await query.getMany();

    const stats = {
      total: tickets.length,
      open: 0,
      closed: 0,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      averageResolutionTime: 0,
      slaCompliance: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let slaCompliantCount = 0;
    let slaTrackedCount = 0;

    tickets.forEach((ticket) => {
      // Count by status
      stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;

      // Count by priority
      stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;

      // Count open/closed
      if (ticket.isOpen()) {
        stats.open++;
      } else if (ticket.isClosed()) {
        stats.closed++;
      }

      // Calculate resolution time
      if (ticket.resolvedAt && ticket.createdAt) {
        const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }

      // Calculate SLA compliance
      if (ticket.resolutionDueAt) {
        slaTrackedCount++;
        if (ticket.resolvedAt && ticket.resolvedAt <= ticket.resolutionDueAt) {
          slaCompliantCount++;
        }
      }
    });

    if (resolvedCount > 0) {
      stats.averageResolutionTime = totalResolutionTime / resolvedCount / (1000 * 60 * 60); // Convert to hours
    }

    if (slaTrackedCount > 0) {
      stats.slaCompliance = (slaCompliantCount / slaTrackedCount) * 100;
    }

    return stats;
  }
}

// Import In from typeorm
import { In } from 'typeorm';
