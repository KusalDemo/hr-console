import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/purchase-order.entity';

/**
 * Purchase Order Repository
 * 
 * Custom repository methods for purchase order queries.
 */
@Injectable()
export class PurchaseOrderRepository extends Repository<PurchaseOrder> {
  constructor(private dataSource: DataSource) {
    super(PurchaseOrder, dataSource.createEntityManager());
  }

  /**
   * Find PO by number
   */
  async findByNumber(poNumber: string): Promise<PurchaseOrder | null> {
    return this.createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .leftJoinAndSelect('po.items', 'items')
      .where('po.poNumber = :poNumber', { poNumber })
      .getOne();
  }

  /**
   * Find PO by ID
   */
  async findById(id: number, includeItems = false): Promise<PurchaseOrder | null> {
    const query = this.createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .where('po.id = :id', { id });

    if (includeItems) {
      query.leftJoinAndSelect('po.items', 'items');
    }

    return query.getOne();
  }

  /**
   * Find POs by status
   */
  async findByStatus(
    status: PurchaseOrderStatus,
    organizationId?: number,
  ): Promise<PurchaseOrder[]> {
    const query = this.createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .where('po.poStatus = :status', { status })
      .orderBy('po.poDate', 'DESC');

    if (organizationId) {
      query.andWhere('po.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find POs by vendor
   */
  async findByVendor(
    vendorId: number,
    organizationId?: number,
  ): Promise<PurchaseOrder[]> {
    const query = this.createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .where('po.vendorId = :vendorId', { vendorId })
      .orderBy('po.poDate', 'DESC');

    if (organizationId) {
      query.andWhere('po.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Check if PO number exists
   */
  async poNumberExists(poNumber: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('po')
      .where('po.poNumber = :poNumber', { poNumber });

    if (excludeId) {
      query.andWhere('po.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

