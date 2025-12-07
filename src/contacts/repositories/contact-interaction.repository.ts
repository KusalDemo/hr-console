import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  ContactInteraction,
  InteractionType,
  InteractionDirection,
} from '../entities/contact-interaction.entity';

/**
 * Contact Interaction Repository
 */
@Injectable()
export class ContactInteractionRepository extends Repository<ContactInteraction> {
  constructor(private dataSource: DataSource) {
    super(ContactInteraction, dataSource.createEntityManager());
  }

  /**
   * Find interactions for a contact
   */
  async findByContact(contactId: number, includeRelations = false): Promise<ContactInteraction[]> {
    const query = this.createQueryBuilder('interaction')
      .where('interaction.contactId = :contactId', { contactId })
      .orderBy('interaction.interactionDate', 'DESC');

    if (includeRelations) {
      query.leftJoinAndSelect('interaction.contact', 'contact');
    }

    return query.getMany();
  }

  /**
   * Find interactions by type
   */
  async findByType(
    interactionType: InteractionType,
    contactId?: number,
  ): Promise<ContactInteraction[]> {
    const query = this.createQueryBuilder('interaction')
      .where('interaction.interactionType = :interactionType', { interactionType })
      .orderBy('interaction.interactionDate', 'DESC');

    if (contactId) {
      query.andWhere('interaction.contactId = :contactId', { contactId });
    }

    return query.getMany();
  }

  /**
   * Find interactions by date range
   */
  async findByDateRange(
    contactId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ContactInteraction[]> {
    return this.createQueryBuilder('interaction')
      .where('interaction.contactId = :contactId', { contactId })
      .andWhere('interaction.interactionDate >= :startDate', { startDate })
      .andWhere('interaction.interactionDate <= :endDate', { endDate })
      .orderBy('interaction.interactionDate', 'DESC')
      .getMany();
  }

  /**
   * Find recent interactions
   */
  async findRecent(contactId: number, limit = 10): Promise<ContactInteraction[]> {
    return this.createQueryBuilder('interaction')
      .where('interaction.contactId = :contactId', { contactId })
      .orderBy('interaction.interactionDate', 'DESC')
      .limit(limit)
      .getMany();
  }
}

