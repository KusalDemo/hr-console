import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Client, ClientStatus, ClientTier } from '../entities/client.entity';

/**
 * Client Repository
 * 
 * Custom repository methods for client queries.
 */
@Injectable()
export class ClientRepository extends Repository<Client> {
  constructor(private dataSource: DataSource) {
    super(Client, dataSource.createEntityManager());
  }

  /**
   * Find client by number
   */
  async findByNumber(clientNumber: string): Promise<Client | null> {
    return this.createQueryBuilder('client')
      .leftJoinAndSelect('client.contact', 'contact')
      .where('client.clientNumber = :clientNumber', { clientNumber })
      .getOne();
  }

  /**
   * Find client by ID
   */
  async findById(id: number, includeContact = false): Promise<Client | null> {
    const query = this.createQueryBuilder('client').where('client.id = :id', { id });

    if (includeContact) {
      query.leftJoinAndSelect('client.contact', 'contact');
    }

    return query.getOne();
  }

  /**
   * Find clients by status
   */
  async findByStatus(
    status: ClientStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Client[]> {
    const query = this.createQueryBuilder('client')
      .where('client.clientStatus = :status', { status })
      .orderBy('client.clientSince', 'DESC')
      .addOrderBy('client.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('client.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('client.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find clients by tier
   */
  async findByTier(
    tier: ClientTier,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Client[]> {
    const query = this.createQueryBuilder('client')
      .where('client.clientTier = :tier', { tier })
      .orderBy('client.clientSince', 'DESC');

    if (organizationId) {
      query.andWhere('client.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('client.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find clients by account manager
   */
  async findByAccountManager(
    accountManagerId: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Client[]> {
    const query = this.createQueryBuilder('client')
      .where('client.accountManagerId = :accountManagerId', { accountManagerId })
      .orderBy('client.clientSince', 'DESC');

    if (organizationId) {
      query.andWhere('client.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('client.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Search clients
   */
  async search(
    searchTerm: string,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Client[]> {
    const query = this.createQueryBuilder('client')
      .leftJoinAndSelect('client.contact', 'contact')
      .where(
        `(
          client.clientNumber ILIKE :searchTerm OR
          contact.fullName ILIKE :searchTerm OR
          contact.companyName ILIKE :searchTerm OR
          contact.email ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('client.clientSince', 'DESC');

    if (organizationId) {
      query.andWhere('client.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('client.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Check if client number exists
   */
  async clientNumberExists(clientNumber: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('client')
      .where('client.clientNumber = :clientNumber', { clientNumber });

    if (excludeId) {
      query.andWhere('client.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

