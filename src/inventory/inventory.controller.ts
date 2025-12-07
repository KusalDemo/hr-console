import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { InventoryService } from './services/inventory.service';
import { InventoryValuationService } from './services/inventory-valuation.service';
import {
  CreateInventoryItemDto,
  CreateInventoryTransactionDto,
  CreateInventoryLocationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ItemType } from './entities/inventory-item.entity';

/**
 * Inventory Controller
 * 
 * REST API endpoints for inventory management:
 * - Inventory items (CRUD, search, low stock alerts)
 * - Inventory transactions (stock movements)
 * - Inventory locations (multi-location support)
 * - Inventory valuation (FIFO, LIFO, average cost)
 */
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly valuationService: InventoryValuationService,
  ) {}

  // ========== Item Endpoints ==========

  /**
   * Create a new inventory item
   * POST /inventory/items
   */
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createItem(
    @Body() createDto: CreateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.createItem(createDto, user.userId);
  }

  /**
   * Get item by ID
   * GET /inventory/items/:id
   */
  @Get('items/:id')
  async getItem(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeTransactions', new ParseBoolPipe({ optional: true })) includeTransactions = false,
  ) {
    return this.inventoryService.getItemById(id, includeTransactions);
  }

  /**
   * Get item by SKU
   * GET /inventory/items/sku/:sku
   */
  @Get('items/sku/:sku')
  async getItemBySKU(@Param('sku') sku: string) {
    return this.inventoryService.getItemBySKU(sku);
  }

  /**
   * Update item
   * PUT /inventory/items/:id
   */
  @Put('items/:id')
  @Roles('ADMIN', 'HR')
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.updateItem(id, updateDto, user.userId);
  }

  /**
   * Get low stock items
   * GET /inventory/items/low-stock
   */
  @Get('items/low-stock')
  @Roles('ADMIN', 'HR')
  async getLowStockItems(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.inventoryService.getLowStockItems(organizationId);
  }

  /**
   * Get out of stock items
   * GET /inventory/items/out-of-stock
   */
  @Get('items/out-of-stock')
  @Roles('ADMIN', 'HR')
  async getOutOfStockItems(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.inventoryService.getOutOfStockItems(organizationId);
  }

  /**
   * Search items
   * GET /inventory/items/search
   */
  @Get('items/search')
  async searchItems(
    @Query('searchTerm') searchTerm?: string,
    @Query('category') category?: string,
    @Query('itemType') itemType?: ItemType,
    @Query('locationId', new ParseIntPipe({ optional: true })) locationId?: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('lowStockOnly', new ParseBoolPipe({ optional: true })) lowStockOnly = false,
  ) {
    return this.inventoryService.searchItems({
      searchTerm,
      category,
      itemType,
      locationId,
      organizationId,
      lowStockOnly,
    });
  }

  // ========== Transaction Endpoints ==========

  /**
   * Create inventory transaction
   * POST /inventory/transactions
   */
  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createTransaction(
    @Body() createDto: CreateInventoryTransactionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.createTransaction(
      {
        ...createDto,
        expiryDate: createDto.expiryDate ? new Date(createDto.expiryDate) : undefined,
        transactionDate: createDto.transactionDate ? new Date(createDto.transactionDate) : undefined,
      },
      user.userId,
    );
  }

  /**
   * Get item transactions
   * GET /inventory/items/:itemId/transactions
   */
  @Get('items/:itemId/transactions')
  async getItemTransactions(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getItemTransactions(
      itemId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get transaction summary
   * GET /inventory/items/:itemId/transaction-summary
   */
  @Get('items/:itemId/transaction-summary')
  async getTransactionSummary(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getTransactionSummary(
      itemId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ========== Location Endpoints ==========

  /**
   * Create inventory location
   * POST /inventory/locations
   */
  @Post('locations')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createLocation(
    @Body() createDto: CreateInventoryLocationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.createLocation(createDto, user.userId);
  }

  /**
   * Get location by ID
   * GET /inventory/locations/:id
   */
  @Get('locations/:id')
  async getLocation(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeItems', new ParseBoolPipe({ optional: true })) includeItems = false,
  ) {
    return this.inventoryService.getLocationById(id, includeItems);
  }

  /**
   * Get locations by organization
   * GET /inventory/locations/organization/:organizationId
   */
  @Get('locations/organization/:organizationId')
  async getLocationsByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.inventoryService.getLocationsByOrganization(organizationId, includeInactive);
  }

  // ========== Valuation Endpoints ==========

  /**
   * Calculate item value
   * GET /inventory/items/:id/valuation
   */
  @Get('items/:id/valuation')
  @Roles('ADMIN', 'HR')
  async calculateItemValue(
    @Param('id', ParseIntPipe) id: number,
    @Query('method') method: 'FIFO' | 'LIFO' | 'AVERAGE' = 'AVERAGE',
  ) {
    return this.valuationService.calculateItemValue(id, method);
  }

  /**
   * Update item cost
   * POST /inventory/items/:id/update-cost
   */
  @Post('items/:id/update-cost')
  @Roles('ADMIN', 'HR')
  async updateItemCost(@Param('id', ParseIntPipe) id: number) {
    return this.valuationService.updateItemCost(id);
  }
}
