import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  InventoryTransaction,
  TransactionType,
  TransactionStatus,
} from '../entities/inventory-transaction.entity';

/**
 * Inventory Transaction Repository
 *
 * Custom repository methods for inventory transaction queries.
 */
@Injectable()
export class InventoryTransactionRepository extends Repository<InventoryTransaction> {
  constructor(private dataSource: DataSource) {
    super(InventoryTransaction, dataSource.createEntityManager());
  }

  /**
   * Find transaction by ID
   */
  async findById(id: number, includeItem = false): Promise<InventoryTransaction | null> {
    const query = this.createQueryBuilder('transaction').where('transaction.id = :id', { id });

    if (includeItem) {
      query.leftJoinAndSelect('transaction.item', 'item');
    }

    return query.getOne();
  }

  /**
   * Find transactions by item
   */
  async findByItem(
    itemId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InventoryTransaction[]> {
    const query = this.createQueryBuilder('transaction')
      .where('transaction.itemId = :itemId', { itemId })
      .orderBy('transaction.transactionDate', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC');

    if (startDate) {
      query.andWhere('transaction.transactionDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('transaction.transactionDate <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Find transactions by type
   */
  async findByType(
    transactionType: TransactionType,
    organizationId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InventoryTransaction[]> {
    const query = this.createQueryBuilder('transaction')
      .leftJoin('transaction.item', 'item')
      .where('transaction.transactionType = :transactionType', { transactionType })
      .orderBy('transaction.transactionDate', 'DESC');

    if (organizationId) {
      query.andWhere('item.organizationId = :organizationId', { organizationId });
    }

    if (startDate) {
      query.andWhere('transaction.transactionDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('transaction.transactionDate <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Find transactions by location
   */
  async findByLocation(
    locationId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InventoryTransaction[]> {
    const query = this.createQueryBuilder('transaction')
      .where('transaction.locationId = :locationId', { locationId })
      .orderBy('transaction.transactionDate', 'DESC');

    if (startDate) {
      query.andWhere('transaction.transactionDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('transaction.transactionDate <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Get transaction summary (raw SQL for performance)
   */
  async getTransactionSummary(
    itemId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalReceipts: number;
    totalIssues: number;
    totalTransfers: number;
    totalAdjustments: number;
    netQuantity: number;
  }> {
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'RECEIPT' AND transaction_status = 'COMPLETED' THEN quantity ELSE 0 END), 0) as total_receipts,
        COALESCE(SUM(CASE WHEN transaction_type = 'ISSUE' AND transaction_status = 'COMPLETED' THEN ABS(quantity) ELSE 0 END), 0) as total_issues,
        COALESCE(SUM(CASE WHEN transaction_type = 'TRANSFER' AND transaction_status = 'COMPLETED' THEN ABS(quantity) ELSE 0 END), 0) as total_transfers,
        COALESCE(SUM(CASE WHEN transaction_type = 'ADJUSTMENT' AND transaction_status = 'COMPLETED' THEN quantity ELSE 0 END), 0) as total_adjustments,
        COALESCE(SUM(
          CASE 
            WHEN transaction_type IN ('RECEIPT', 'RETURN', 'ADJUSTMENT') AND transaction_status = 'COMPLETED' THEN quantity
            WHEN transaction_type IN ('ISSUE', 'TRANSFER', 'WRITE_OFF') AND transaction_status = 'COMPLETED' THEN -quantity
            ELSE 0
          END
        ), 0) as net_quantity
      FROM inventory_transactions
      WHERE item_id = $1
    `;

    const params: any[] = [itemId];

    if (startDate) {
      query += ` AND transaction_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND transaction_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    const result = await this.query(query, params);

    return {
      totalReceipts: parseFloat(result[0]?.total_receipts || '0'),
      totalIssues: parseFloat(result[0]?.total_issues || '0'),
      totalTransfers: parseFloat(result[0]?.total_transfers || '0'),
      totalAdjustments: parseFloat(result[0]?.total_adjustments || '0'),
      netQuantity: parseFloat(result[0]?.net_quantity || '0'),
    };
  }
}
