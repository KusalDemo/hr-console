import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { InventoryTransactionRepository } from '../repositories/inventory-transaction.repository';
import { InventoryItem } from '../entities/inventory-item.entity';
import {
  InventoryTransaction,
  TransactionType,
  TransactionStatus,
} from '../entities/inventory-transaction.entity';

/**
 * Inventory Valuation Service
 *
 * Handles inventory valuation with:
 * - FIFO (First In, First Out)
 * - LIFO (Last In, First Out)
 * - Average Cost
 */
@Injectable()
export class InventoryValuationService {
  private readonly logger = new Logger(InventoryValuationService.name);

  constructor(
    private readonly itemRepository: InventoryItemRepository,
    private readonly transactionRepository: InventoryTransactionRepository,
  ) {}

  /**
   * Calculate item value using specified method
   */
  async calculateItemValue(
    itemId: number,
    valuationMethod: 'FIFO' | 'LIFO' | 'AVERAGE' = 'AVERAGE',
  ): Promise<{
    totalValue: number;
    averageCost: number;
    quantity: number;
  }> {
    const item = await this.itemRepository.findById(itemId);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    const method = valuationMethod || item.valuationMethod || 'AVERAGE';

    switch (method) {
      case 'FIFO':
        return this.calculateFIFO(itemId);
      case 'LIFO':
        return this.calculateLIFO(itemId);
      case 'AVERAGE':
      default:
        return this.calculateAverageCost(itemId);
    }
  }

  /**
   * Calculate FIFO value
   */
  private async calculateFIFO(itemId: number): Promise<{
    totalValue: number;
    averageCost: number;
    quantity: number;
  }> {
    // Get all receipt transactions ordered by date (oldest first)
    const receipts = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.itemId = :itemId', { itemId })
      .andWhere('transaction.transactionType IN (:...types)', {
        types: [TransactionType.RECEIPT, TransactionType.RETURN],
      })
      .andWhere('transaction.transactionStatus = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .orderBy('transaction.transactionDate', 'ASC')
      .addOrderBy('transaction.createdAt', 'ASC')
      .getMany();

    // Get all issue transactions
    const issues = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.itemId = :itemId', { itemId })
      .andWhere('transaction.transactionType IN (:...types)', {
        types: [TransactionType.ISSUE, TransactionType.TRANSFER, TransactionType.WRITE_OFF],
      })
      .andWhere('transaction.transactionStatus = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .orderBy('transaction.transactionDate', 'ASC')
      .getMany();

    // Simulate FIFO: track remaining quantities from each receipt
    const receiptLayers: Array<{ quantity: number; unitCost: number }> = [];

    // Build receipt layers
    for (const receipt of receipts) {
      if (receipt.unitCost && receipt.quantity > 0) {
        receiptLayers.push({
          quantity: receipt.quantity,
          unitCost: parseFloat(receipt.unitCost.toString()),
        });
      }
    }

    // Apply issues (FIFO: oldest first)
    let remainingIssues = issues.reduce((sum, issue) => sum + Math.abs(issue.quantity), 0);

    for (const layer of receiptLayers) {
      if (remainingIssues <= 0) break;

      const consumed = Math.min(layer.quantity, remainingIssues);
      layer.quantity -= consumed;
      remainingIssues -= consumed;
    }

    // Calculate value from remaining layers
    const totalValue = receiptLayers.reduce(
      (sum, layer) => sum + layer.quantity * layer.unitCost,
      0,
    );
    const totalQuantity = receiptLayers.reduce((sum, layer) => sum + layer.quantity, 0);
    const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    return {
      totalValue,
      averageCost,
      quantity: totalQuantity,
    };
  }

  /**
   * Calculate LIFO value
   */
  private async calculateLIFO(itemId: number): Promise<{
    totalValue: number;
    averageCost: number;
    quantity: number;
  }> {
    // Similar to FIFO but process receipts in reverse order (newest first)
    const receipts = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.itemId = :itemId', { itemId })
      .andWhere('transaction.transactionType IN (:...types)', {
        types: [TransactionType.RECEIPT, TransactionType.RETURN],
      })
      .andWhere('transaction.transactionStatus = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .orderBy('transaction.transactionDate', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC')
      .getMany();

    const issues = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.itemId = :itemId', { itemId })
      .andWhere('transaction.transactionType IN (:...types)', {
        types: [TransactionType.ISSUE, TransactionType.TRANSFER, TransactionType.WRITE_OFF],
      })
      .andWhere('transaction.transactionStatus = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .orderBy('transaction.transactionDate', 'ASC')
      .getMany();

    const receiptLayers: Array<{ quantity: number; unitCost: number }> = [];

    for (const receipt of receipts) {
      if (receipt.unitCost && receipt.quantity > 0) {
        receiptLayers.push({
          quantity: receipt.quantity,
          unitCost: parseFloat(receipt.unitCost.toString()),
        });
      }
    }

    // Apply issues (LIFO: newest first)
    let remainingIssues = issues.reduce((sum, issue) => sum + Math.abs(issue.quantity), 0);

    for (let i = receiptLayers.length - 1; i >= 0; i--) {
      if (remainingIssues <= 0) break;

      const layer = receiptLayers[i];
      const consumed = Math.min(layer.quantity, remainingIssues);
      layer.quantity -= consumed;
      remainingIssues -= consumed;
    }

    const totalValue = receiptLayers.reduce(
      (sum, layer) => sum + layer.quantity * layer.unitCost,
      0,
    );
    const totalQuantity = receiptLayers.reduce((sum, layer) => sum + layer.quantity, 0);
    const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    return {
      totalValue,
      averageCost,
      quantity: totalQuantity,
    };
  }

  /**
   * Calculate average cost
   */
  private async calculateAverageCost(itemId: number): Promise<{
    totalValue: number;
    averageCost: number;
    quantity: number;
  }> {
    // Get all receipt transactions with costs
    const receipts = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.itemId = :itemId', { itemId })
      .andWhere('transaction.transactionType IN (:...types)', {
        types: [TransactionType.RECEIPT, TransactionType.RETURN],
      })
      .andWhere('transaction.transactionStatus = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.unitCost IS NOT NULL')
      .getMany();

    const item = await this.itemRepository.findById(itemId);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    // Calculate weighted average
    let totalCost = 0;
    let totalQuantity = 0;

    for (const receipt of receipts) {
      const quantity = receipt.quantity;
      const unitCost = parseFloat(receipt.unitCost?.toString() || '0');

      if (quantity > 0 && unitCost > 0) {
        totalCost += quantity * unitCost;
        totalQuantity += quantity;
      }
    }

    const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    const currentQuantity = parseFloat(item.stockQuantity.toString());
    const totalValue = currentQuantity * averageCost;

    return {
      totalValue,
      averageCost,
      quantity: currentQuantity,
    };
  }

  /**
   * Update item cost based on valuation method
   */
  async updateItemCost(itemId: number): Promise<InventoryItem> {
    const item = await this.itemRepository.findById(itemId);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    const valuation = await this.calculateItemValue(itemId, item.valuationMethod as any);

    item.costPerUnit = valuation.averageCost;
    await this.itemRepository.save(item);

    this.logger.log(`Updated item cost for ${itemId}: ${valuation.averageCost}`);

    return item;
  }
}
