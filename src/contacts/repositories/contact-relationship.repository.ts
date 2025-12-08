import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ContactRelationship, RelationshipType } from '../entities/contact-relationship.entity';

/**
 * Contact Relationship Repository
 */
@Injectable()
export class ContactRelationshipRepository extends Repository<ContactRelationship> {
  constructor(private dataSource: DataSource) {
    super(ContactRelationship, dataSource.createEntityManager());
  }

  /**
   * Find relationships for a contact
   */
  async findByContact(contactId: number, includeRelations = false): Promise<ContactRelationship[]> {
    const query = this.createQueryBuilder('relationship')
      .where('relationship.contactId = :contactId', { contactId })
      .andWhere('relationship.isActive = :isActive', { isActive: true })
      .orderBy('relationship.createdAt', 'DESC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('relationship.contact', 'contact')
        .leftJoinAndSelect('relationship.relatedContact', 'relatedContact');
    }

    return query.getMany();
  }

  /**
   * Find relationships where contact is the related contact
   */
  async findByRelatedContact(
    relatedContactId: number,
    includeRelations = false,
  ): Promise<ContactRelationship[]> {
    const query = this.createQueryBuilder('relationship')
      .where('relationship.relatedContactId = :relatedContactId', { relatedContactId })
      .andWhere('relationship.isActive = :isActive', { isActive: true })
      .orderBy('relationship.createdAt', 'DESC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('relationship.contact', 'contact')
        .leftJoinAndSelect('relationship.relatedContact', 'relatedContact');
    }

    return query.getMany();
  }

  /**
   * Find relationships by type
   */
  async findByType(
    relationshipType: RelationshipType,
    contactId?: number,
  ): Promise<ContactRelationship[]> {
    const query = this.createQueryBuilder('relationship')
      .where('relationship.relationshipType = :relationshipType', { relationshipType })
      .andWhere('relationship.isActive = :isActive', { isActive: true })
      .orderBy('relationship.createdAt', 'DESC');

    if (contactId) {
      query.andWhere(
        '(relationship.contactId = :contactId OR relationship.relatedContactId = :contactId)',
        { contactId },
      );
    }

    return query.getMany();
  }

  /**
   * Find relationship between two contacts
   */
  async findByContacts(
    contactId: number,
    relatedContactId: number,
  ): Promise<ContactRelationship | null> {
    return this.createQueryBuilder('relationship')
      .where('relationship.contactId = :contactId', { contactId })
      .andWhere('relationship.relatedContactId = :relatedContactId', {
        relatedContactId,
      })
      .getOne();
  }
}


