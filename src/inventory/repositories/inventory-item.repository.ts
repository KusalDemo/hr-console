import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InventoryItem, ItemType, ItemStatus } from '../entities/inventory-item.entity';

/**
 * Inventory Item Repository
 *
 * Custom repository methods for inventory item queries with optimized stock calculations.
 */
@Injectable()
export class InventoryItemRepository extends Repository<InventoryItem> {
  constructor(private dataSource: DataSource) {
    super(InventoryItem, dataSource.createEntityManager());
  }

  /**
   * Find item by ID
   */
  async findById(id: number, includeTransactions = false): Promise<InventoryItem | null> {
    const query = this.createQueryBuilder('item').where('item.id = :id', { id });

    if (includeTransactions) {
      query.leftJoinAndSelect('item.transactions', 'transactions');
    }

    return query.getOne();
  }

  /**
   * Find item by SKU
   */
  async findBySKU(sku: string): Promise<InventoryItem | null> {
    return this.createQueryBuilder('item').where('item.sku = :sku', { sku }).getOne();
  }

  /**
   * Find items by category
   */
  async findByCategory(category: string, organizationId?: number): Promise<InventoryItem[]> {
    const query = this.createQueryBuilder('item')
      .where('item.category = :category', { category })
      .andWhere('item.itemStatus = :status', { status: ItemStatus.ACTIVE })
      .orderBy('item.itemName', 'ASC');

    if (organizationId) {
      query.andWhere('item.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find items by location
   */
  async findByLocation(locationId: number, organizationId?: number): Promise<InventoryItem[]> {
    const query = this.createQueryBuilder('item')
      .where('item.locationId = :locationId', { locationId })
      .andWhere('item.itemStatus = :status', { status: ItemStatus.ACTIVE })
      .orderBy('item.itemName', 'ASC');

    if (organizationId) {
      query.andWhere('item.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find low stock items (below reorder point)
   */
  async findLowStock(organizationId?: number): Promise<InventoryItem[]> {
    const query = this.createQueryBuilder('item')
      .where('item.itemStatus = :status', { status: ItemStatus.ACTIVE })
      .andWhere('item.reorderPoint IS NOT NULL')
      .andWhere('item.stockQuantity <= item.reorderPoint')
      .orderBy('item.stockQuantity', 'ASC');

    if (organizationId) {
      query.andWhere('item.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find out of stock items
   */
  async findOutOfStock(organizationId?: number): Promise<InventoryItem[]> {
    const query = this.createQueryBuilder('item')
      .where('item.itemStatus = :status', { status: ItemStatus.ACTIVE })
      .andWhere('item.stockQuantity <= 0')
      .orderBy('item.itemName', 'ASC');

    if (organizationId) {
      query.andWhere('item.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Calculate current stock (raw SQL for performance)
   */
  async calculateStock(itemId: number): Promise<number> {
    const result = await this.query(
      `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN transaction_type IN ('RECEIPT', 'RETURN', 'ADJUSTMENT') AND transaction_status = 'COMPLETED' THEN quantity
            WHEN transaction_type IN ('ISSUE', 'TRANSFER', 'WRITE_OFF') AND transaction_status = 'COMPLETED' THEN -quantity
            ELSE 0
          END
        ), 0) as stock
      FROM inventory_transactions
      WHERE item_id = $1
    `,
      [itemId],
    );

    return parseFloat(result[0]?.stock || '0');
  }

  /**
   * Search items
   */
  async searchItems(
    searchTerm?: string,
    category?: string,
    itemType?: ItemType,
    locationId?: number,
    organizationId?: number,
    lowStockOnly = false,
  ): Promise<InventoryItem[]> {
    const query = this.createQueryBuilder('item')
      .where('item.itemStatus = :status', { status: ItemStatus.ACTIVE })
      .orderBy('item.itemName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          item.itemName ILIKE :searchTerm OR
          item.sku ILIKE :searchTerm OR
          item.itemDescription ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (category) {
      query.andWhere('item.category = :category', { category });
    }

    if (itemType) {
      query.andWhere('item.itemType = :itemType', { itemType });
    }

    if (locationId) {
      query.andWhere('item.locationId = :locationId', { locationId });
    }

    if (organizationId) {
      query.andWhere('item.organizationId = :organizationId', { organizationId });
    }

    if (lowStockOnly) {
      query.andWhere('item.reorderPoint IS NOT NULL');
      query.andWhere('item.stockQuantity <= item.reorderPoint');
    }

    return query.getMany();
  }
}
