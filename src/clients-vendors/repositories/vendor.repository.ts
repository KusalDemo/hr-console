import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Vendor, VendorType, VendorStatus } from '../entities/vendor.entity';

/**
 * Vendor Repository
 * 
 * Custom repository methods for vendor queries.
 */
@Injectable()
export class VendorRepository extends Repository<Vendor> {
  constructor(private dataSource: DataSource) {
    super(Vendor, dataSource.createEntityManager());
  }

  /**
   * Find vendor by number
   */
  async findByNumber(vendorNumber: string): Promise<Vendor | null> {
    return this.createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.contact', 'contact')
      .where('vendor.vendorNumber = :vendorNumber', { vendorNumber })
      .getOne();
  }

  /**
   * Find vendor by ID
   */
  async findById(id: number, includeContact = false): Promise<Vendor | null> {
    const query = this.createQueryBuilder('vendor').where('vendor.id = :id', { id });

    if (includeContact) {
      query.leftJoinAndSelect('vendor.contact', 'contact');
    }

    return query.getOne();
  }

  /**
   * Find vendors by type
   */
  async findByType(
    type: VendorType,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Vendor[]> {
    const query = this.createQueryBuilder('vendor')
      .where('vendor.vendorType = :type', { type })
      .orderBy('vendor.vendorSince', 'DESC')
      .addOrderBy('vendor.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('vendor.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('vendor.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find vendors by status
   */
  async findByStatus(
    status: VendorStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Vendor[]> {
    const query = this.createQueryBuilder('vendor')
      .where('vendor.vendorStatus = :status', { status })
      .orderBy('vendor.vendorSince', 'DESC');

    if (organizationId) {
      query.andWhere('vendor.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('vendor.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find top-rated vendors
   */
  async findTopRated(
    minRating: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Vendor[]> {
    const query = this.createQueryBuilder('vendor')
      .where('vendor.averageRating >= :minRating', { minRating })
      .orderBy('vendor.averageRating', 'DESC')
      .addOrderBy('vendor.totalRatings', 'DESC');

    if (organizationId) {
      query.andWhere('vendor.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('vendor.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Search vendors
   */
  async search(
    searchTerm: string,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Vendor[]> {
    const query = this.createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.contact', 'contact')
      .where(
        `(
          vendor.vendorNumber ILIKE :searchTerm OR
          contact.fullName ILIKE :searchTerm OR
          contact.companyName ILIKE :searchTerm OR
          contact.email ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('vendor.averageRating', 'DESC')
      .addOrderBy('vendor.vendorSince', 'DESC');

    if (organizationId) {
      query.andWhere('vendor.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('vendor.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Check if vendor number exists
   */
  async vendorNumberExists(vendorNumber: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('vendor')
      .where('vendor.vendorNumber = :vendorNumber', { vendorNumber });

    if (excludeId) {
      query.andWhere('vendor.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

