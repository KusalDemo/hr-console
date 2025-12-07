import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketSLA } from '../entities/ticket-sla.entity';

/**
 * Ticket SLA Repository
 * Provides custom queries for ticket SLA operations
 */
@Injectable()
export class TicketSLARepository extends Repository<TicketSLA> {
  constructor(private dataSource: DataSource) {
    super(TicketSLA, dataSource.createEntityManager());
  }

  /**
   * Find SLA by ID
   */
  async findById(id: number): Promise<TicketSLA | null> {
    return this.findOne({
      where: { id, isActive: true },
    });
  }

  /**
   * Find default SLA for organization
   */
  async findDefaultSLA(organizationId?: number): Promise<TicketSLA | null> {
    const query = this.createQueryBuilder('sla')
      .where('sla.isDefault = :isDefault', { isDefault: true })
      .andWhere('sla.isActive = :isActive', { isActive: true });

    if (organizationId !== undefined) {
      query.andWhere('(sla.organizationId = :organizationId OR sla.organizationId IS NULL)', {
        organizationId,
      });
    } else {
      query.andWhere('sla.organizationId IS NULL');
    }

    return query.orderBy('sla.organizationId', 'DESC').getOne(); // Prefer org-specific over global
  }

  /**
   * Find SLAs by organization
   */
  async findByOrganization(organizationId: number | null): Promise<TicketSLA[]> {
    const query = this.createQueryBuilder('sla')
      .where('sla.isActive = :isActive', { isActive: true })
      .orderBy('sla.name', 'ASC');

    if (organizationId !== null) {
      query.andWhere('(sla.organizationId = :organizationId OR sla.organizationId IS NULL)', {
        organizationId,
      });
    } else {
      query.andWhere('sla.organizationId IS NULL');
    }

    return query.getMany();
  }
}
