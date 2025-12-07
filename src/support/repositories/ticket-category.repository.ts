import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketCategory } from '../entities/ticket-category.entity';

/**
 * Ticket Category Repository
 * Provides custom queries for ticket category operations
 */
@Injectable()
export class TicketCategoryRepository extends Repository<TicketCategory> {
  constructor(private dataSource: DataSource) {
    super(TicketCategory, dataSource.createEntityManager());
  }

  /**
   * Find category by ID
   */
  async findById(id: number): Promise<TicketCategory | null> {
    return this.findOne({
      where: { id, isActive: true },
    });
  }

  /**
   * Find categories by organization
   */
  async findByOrganization(organizationId: number | null): Promise<TicketCategory[]> {
    const query = this.createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true })
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    if (organizationId !== null) {
      query.andWhere(
        '(category.organizationId = :organizationId OR category.organizationId IS NULL)',
        { organizationId },
      );
    } else {
      query.andWhere('category.organizationId IS NULL');
    }

    return query.getMany();
  }
}
