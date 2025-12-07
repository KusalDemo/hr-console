import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService, InventoryValuationService } from './services';
import {
  InventoryItemRepository,
  InventoryTransactionRepository,
  InventoryLocationRepository,
} from './repositories';
import { InventoryItem, InventoryTransaction, InventoryLocation } from './entities';

/**
 * Inventory Module
 *
 * Provides complete inventory tracking and valuation:
 * - Inventory items with SKU, categories, stock levels, locations
 * - Inventory transactions for stock movements (in, out, transfer, adjustment)
 * - Multi-location inventory support
 * - Bin tracking, serial numbers
 * - Inventory valuation (FIFO, LIFO, average cost)
 * - Low stock alerts
 * - Support for item variants, bundles, assembly/disassembly
 */
@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, InventoryTransaction, InventoryLocation])],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryValuationService,
    InventoryItemRepository,
    InventoryTransactionRepository,
    InventoryLocationRepository,
  ],
  exports: [
    InventoryService,
    InventoryValuationService,
    InventoryItemRepository,
    InventoryTransactionRepository,
    InventoryLocationRepository,
  ],
})
export class InventoryModule {}
