import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { InventoryTransactionRepository } from '../repositories/inventory-transaction.repository';
import { InventoryLocationRepository } from '../repositories/inventory-location.repository';
import {
  InventoryItem,
  ItemType,
  ItemStatus,
} from '../entities/inventory-item.entity';
import {
  InventoryTransaction,
  TransactionType,
  TransactionStatus,
} from '../entities/inventory-transaction.entity';
import { InventoryLocation } from '../entities/inventory-location.entity';

/**
 * Inventory Service
 * 
 * Manages inventory with:
 * - Item CRUD operations
 * - Stock tracking
 * - Low stock alerts
 * - Transaction management
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly itemRepository: InventoryItemRepository,
    private readonly transactionRepository: InventoryTransactionRepository,
    private readonly locationRepository: InventoryLocationRepository,
  ) {}

  // ========== Item Methods ==========

  /**
   * Create a new inventory item
   */
  async createItem(createDto: any, createdBy?: number): Promise<InventoryItem> {
    // Check if SKU already exists
    const existing = await this.itemRepository.findBySKU(createDto.sku);
    if (existing) {
      throw new BadRequestException(`Item with SKU ${createDto.sku} already exists`);
    }

    const item = this.itemRepository.create({
      ...createDto,
      itemType: createDto.itemType || ItemType.PRODUCT,
      itemStatus: createDto.itemStatus || ItemStatus.ACTIVE,
      stockQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      createdBy,
    });

    const saved = await this.itemRepository.save(item);

    this.logger.log(`Created inventory item: ${saved.id} (${saved.sku})`);

    return saved;
  }

  /**
   * Get item by ID
   */
  async getItemById(id: number, includeTransactions = false): Promise<InventoryItem> {
    const item = await this.itemRepository.findById(id, includeTransactions);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Get item by SKU
   */
  async getItemBySKU(sku: string): Promise<InventoryItem> {
    const item = await this.itemRepository.findBySKU(sku);

    if (!item) {
      throw new NotFoundException(`Inventory item with SKU ${sku} not found`);
    }

    return item;
  }

  /**
   * Update item
   */
  async updateItem(id: number, updateDto: any, updatedBy?: number): Promise<InventoryItem> {
    const item = await this.itemRepository.findById(id);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    // Check SKU uniqueness if changing
    if (updateDto.sku && updateDto.sku !== item.sku) {
      const existing = await this.itemRepository.findBySKU(updateDto.sku);
      if (existing) {
        throw new BadRequestException(`Item with SKU ${updateDto.sku} already exists`);
      }
    }

    Object.assign(item, {
      ...updateDto,
      updatedBy,
    });

    // Recalculate available quantity
    item.availableQuantity = item.stockQuantity - item.reservedQuantity;

    const saved = await this.itemRepository.save(item);

    this.logger.log(`Updated inventory item: ${id}`);

    return saved;
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(organizationId?: number): Promise<InventoryItem[]> {
    return this.itemRepository.findLowStock(organizationId);
  }

  /**
   * Get out of stock items
   */
  async getOutOfStockItems(organizationId?: number): Promise<InventoryItem[]> {
    return this.itemRepository.findOutOfStock(organizationId);
  }

  // ========== Transaction Methods ==========

  /**
   * Create inventory transaction
   */
  async createTransaction(
    createDto: {
      itemId: number;
      transactionType: TransactionType;
      quantity: number;
      unitCost?: number;
      locationId?: number;
      toLocationId?: number;
      referenceNumber?: string;
      referenceType?: string;
      serialNumbers?: string[];
      lotNumber?: string;
      expiryDate?: Date;
      notes?: string;
    },
    createdBy?: number,
  ): Promise<InventoryTransaction> {
    const item = await this.itemRepository.findById(createDto.itemId);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${createDto.itemId} not found`);
    }

    // Validate quantity based on transaction type
    if (
      (createDto.transactionType === TransactionType.ISSUE ||
        createDto.transactionType === TransactionType.TRANSFER ||
        createDto.transactionType === TransactionType.WRITE_OFF) &&
      createDto.quantity > item.availableQuantity
    ) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.availableQuantity}, Requested: ${createDto.quantity}`,
      );
    }

    // Get current stock
    const stockBefore = item.stockQuantity;

    // Calculate stock after
    let stockAfter = stockBefore;
    if (createDto.transactionType === TransactionType.RECEIPT || createDto.transactionType === TransactionType.RETURN) {
      stockAfter = stockBefore + createDto.quantity;
    } else if (
      createDto.transactionType === TransactionType.ISSUE ||
      createDto.transactionType === TransactionType.TRANSFER ||
      createDto.transactionType === TransactionType.WRITE_OFF
    ) {
      stockAfter = stockBefore - createDto.quantity;
    } else if (createDto.transactionType === TransactionType.ADJUSTMENT) {
      stockAfter = stockBefore + createDto.quantity; // Adjustment can be positive or negative
    }

    // Calculate total cost
    const totalCost =
      createDto.unitCost !== undefined
        ? createDto.unitCost * Math.abs(createDto.quantity)
        : null;

    const transaction = this.transactionRepository.create({
      ...createDto,
      transactionDate: createDto.transactionDate || new Date(),
      transactionStatus: TransactionStatus.COMPLETED, // Auto-complete for now
      stockBefore,
      stockAfter,
      totalCost,
      createdBy,
    });

    const saved = await this.transactionRepository.save(transaction);

    // Update item stock
    item.stockQuantity = stockAfter;
    item.availableQuantity = item.stockQuantity - item.reservedQuantity;
    await this.itemRepository.save(item);

    this.logger.log(
      `Created transaction: ${saved.id} (${createDto.transactionType}) for item ${createDto.itemId}`,
    );

    return saved;
  }

  /**
   * Get transactions for item
   */
  async getItemTransactions(
    itemId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InventoryTransaction[]> {
    return this.transactionRepository.findByItem(itemId, startDate, endDate);
  }

  /**
   * Get transaction summary
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
    return this.transactionRepository.getTransactionSummary(itemId, startDate, endDate);
  }

  // ========== Location Methods ==========

  /**
   * Create inventory location
   */
  async createLocation(createDto: any, createdBy?: number): Promise<InventoryLocation> {
    const location = this.locationRepository.create({
      ...createDto,
      isActive: true,
      createdBy,
    });

    const saved = await this.locationRepository.save(location);

    this.logger.log(`Created inventory location: ${saved.id} (${saved.locationName})`);

    return saved;
  }

  /**
   * Get location by ID
   */
  async getLocationById(id: number, includeItems = false): Promise<InventoryLocation> {
    const location = await this.locationRepository.findById(id, includeItems);

    if (!location) {
      throw new NotFoundException(`Inventory location with ID ${id} not found`);
    }

    return location;
  }

  /**
   * Get locations by organization
   */
  async getLocationsByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<InventoryLocation[]> {
    return this.locationRepository.findByOrganization(organizationId, includeInactive);
  }

  /**
   * Search items
   */
  async searchItems(filters: {
    searchTerm?: string;
    category?: string;
    itemType?: ItemType;
    locationId?: number;
    organizationId?: number;
    lowStockOnly?: boolean;
  }): Promise<InventoryItem[]> {
    return this.itemRepository.searchItems(
      filters.searchTerm,
      filters.category,
      filters.itemType,
      filters.locationId,
      filters.organizationId,
      filters.lowStockOnly,
    );
  }
}
