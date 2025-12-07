import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Contact,
  ContactType,
  ContactCategory,
  ContactStatus,
} from '../entities/contact.entity';

/**
 * Contact Repository
 * 
 * Custom repository methods for contact queries with full-text search.
 */
@Injectable()
export class ContactRepository extends Repository<Contact> {
  constructor(private dataSource: DataSource) {
    super(Contact, dataSource.createEntityManager());
  }

  /**
   * Find contact by key
   */
  async findByKey(contactKey: string, includeRelations = false): Promise<Contact | null> {
    const query = this.createQueryBuilder('contact')
      .where('contact.contactKey = :contactKey', { contactKey });

    if (includeRelations) {
      query
        .leftJoinAndSelect('contact.relationships', 'relationships')
        .leftJoinAndSelect('relationships.relatedContact', 'relatedContact')
        .leftJoinAndSelect('contact.interactions', 'interactions');
    }

    return query.getOne();
  }

  /**
   * Find contact by ID
   */
  async findById(id: number, includeRelations = false): Promise<Contact | null> {
    const query = this.createQueryBuilder('contact').where('contact.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('contact.relationships', 'relationships')
        .leftJoinAndSelect('relationships.relatedContact', 'relatedContact')
        .leftJoinAndSelect('contact.interactions', 'interactions');
    }

    return query.getOne();
  }

  /**
   * Find contact by email
   */
  async findByEmail(email: string): Promise<Contact | null> {
    return this.createQueryBuilder('contact')
      .where('contact.email = :email', { email })
      .orWhere('contact.emailSecondary = :email', { email })
      .getOne();
  }

  /**
   * Find contacts by category
   */
  async findByCategory(
    category: ContactCategory,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Contact[]> {
    const query = this.createQueryBuilder('contact')
      .where('contact.contactCategory = :category', { category })
      .orderBy('contact.fullName', 'ASC');

    if (organizationId) {
      query.andWhere('contact.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('contact.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find contacts by status
   */
  async findByStatus(
    status: ContactStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Contact[]> {
    const query = this.createQueryBuilder('contact')
      .where('contact.contactStatus = :status', { status })
      .orderBy('contact.fullName', 'ASC');

    if (organizationId) {
      query.andWhere('contact.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('contact.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find contacts by type
   */
  async findByType(
    type: ContactType,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Contact[]> {
    const query = this.createQueryBuilder('contact')
      .where('contact.contactType = :type', { type })
      .orderBy('contact.fullName', 'ASC');

    if (organizationId) {
      query.andWhere('contact.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('contact.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Full-text search contacts
   * Uses PostgreSQL full-text search on name, email, company, tags
   */
  async search(
    searchTerm: string,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Contact[]> {
    const query = this.createQueryBuilder('contact')
      .where(
        `(
          contact.fullName ILIKE :searchTerm OR
          contact.displayName ILIKE :searchTerm OR
          contact.companyName ILIKE :searchTerm OR
          contact.email ILIKE :searchTerm OR
          contact.emailSecondary ILIKE :searchTerm OR
          contact.phone ILIKE :searchTerm OR
          contact.contactNumber ILIKE :searchTerm OR
          contact.tags ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('contact.fullName', 'ASC');

    if (organizationId) {
      query.andWhere('contact.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('contact.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find potential duplicates based on email, phone, or name
   */
  async findPotentialDuplicates(
    contact: Partial<Contact>,
    excludeId?: number,
  ): Promise<Contact[]> {
    const conditions: string[] = [];
    const params: any = {};

    if (excludeId) {
      conditions.push('contact.id != :excludeId');
      params.excludeId = excludeId;
    }

    if (contact.email) {
      conditions.push(
        '(contact.email = :email OR contact.emailSecondary = :email)',
      );
      params.email = contact.email;
    }

    if (contact.phone) {
      conditions.push(
        '(contact.phone = :phone OR contact.phoneMobile = :phone OR contact.phoneWork = :phone)',
      );
      params.phone = contact.phone;
    }

    if (contact.fullName) {
      conditions.push('contact.fullName ILIKE :fullName');
      params.fullName = contact.fullName;
    }

    if (conditions.length === 0) {
      return [];
    }

    return this.createQueryBuilder('contact')
      .where(conditions.join(' OR '), params)
      .andWhere('contact.isArchived = :isArchived', { isArchived: false })
      .getMany();
  }

  /**
   * Find contacts by tags
   */
  async findByTags(
    tags: string[],
    organizationId?: number,
    includeArchived = false,
  ): Promise<Contact[]> {
    const query = this.createQueryBuilder('contact')
      .where('contact.isArchived = :isArchived', { isArchived: !includeArchived });

    // Search for contacts that have any of the specified tags
    const tagConditions = tags.map((tag, index) => {
      const paramName = `tag${index}`;
      query.setParameter(paramName, `%${tag}%`);
      return `contact.tags ILIKE :${paramName}`;
    });

    if (tagConditions.length > 0) {
      query.andWhere(`(${tagConditions.join(' OR ')})`);
    }

    if (organizationId) {
      query.andWhere('contact.organizationId = :organizationId', { organizationId });
    }

    query.orderBy('contact.fullName', 'ASC');

    return query.getMany();
  }

  /**
   * Find contacts needing follow-up
   */
  async findNeedingFollowUp(
    organizationId?: number,
    daysAhead = 7,
  ): Promise<Contact[]> {
    const query = this.createQueryBuilder('contact')
      .where('contact.nextFollowUpDate IS NOT NULL')
      .andWhere('contact.nextFollowUpDate <= :endDate', {
        endDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
      })
      .andWhere('contact.isArchived = :isArchived', { isArchived: false })
      .andWhere('contact.contactStatus = :status', { status: ContactStatus.ACTIVE })
      .orderBy('contact.nextFollowUpDate', 'ASC');

    if (organizationId) {
      query.andWhere('contact.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Check if contact key exists
   */
  async contactKeyExists(contactKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('contact')
      .where('contact.contactKey = :contactKey', { contactKey });

    if (excludeId) {
      query.andWhere('contact.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}


