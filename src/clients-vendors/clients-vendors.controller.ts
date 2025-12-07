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
import { ClientVendorService } from './services/client-vendor.service';
import { CreateClientDto, CreateVendorDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ClientStatus,
  VendorType,
  VendorStatus,
  PurchaseOrderStatus,
  ContractStatus,
} from './entities';

/**
 * Clients Vendors Controller
 *
 * REST API endpoints for client and vendor management:
 * - Clients (CRUD, search, contract tracking)
 * - Vendors (CRUD, search, performance tracking)
 * - Purchase orders
 * - Vendor ratings and certifications
 * - Contracts and agreements
 */
@Controller('clients-vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsVendorsController {
  constructor(private readonly clientVendorService: ClientVendorService) {}

  // ========== Client Endpoints ==========

  /**
   * Create a new client
   * POST /clients-vendors/clients
   */
  @Post('clients')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'SALES', 'EMPLOYEE')
  async createClient(@Body() createDto: CreateClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientVendorService.createClient(createDto, user.userId);
  }

  /**
   * Get client by ID
   * GET /clients-vendors/clients/:id
   */
  @Get('clients/:id')
  async getClient(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeContact', new ParseBoolPipe({ optional: true })) includeContact = false,
  ) {
    return this.clientVendorService.getClientById(id, includeContact);
  }

  /**
   * Update client
   * PUT /clients-vendors/clients/:id
   */
  @Put('clients/:id')
  @Roles('ADMIN', 'HR', 'SALES')
  async updateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientVendorService.updateClient(id, updateDto, user.userId);
  }

  // ========== Vendor Endpoints ==========

  /**
   * Create a new vendor
   * POST /clients-vendors/vendors
   */
  @Post('vendors')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROCUREMENT', 'EMPLOYEE')
  async createVendor(@Body() createDto: CreateVendorDto, @CurrentUser() user: JwtPayload) {
    return this.clientVendorService.createVendor(createDto, user.userId);
  }

  /**
   * Get vendor by ID
   * GET /clients-vendors/vendors/:id
   */
  @Get('vendors/:id')
  async getVendor(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeContact', new ParseBoolPipe({ optional: true })) includeContact = false,
  ) {
    return this.clientVendorService.getVendorById(id, includeContact);
  }

  /**
   * Update vendor
   * PUT /clients-vendors/vendors/:id
   */
  @Put('vendors/:id')
  @Roles('ADMIN', 'HR', 'PROCUREMENT')
  async updateVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientVendorService.updateVendor(id, updateDto, user.userId);
  }

  // ========== Purchase Order Endpoints ==========

  /**
   * Create a new purchase order
   * POST /clients-vendors/purchase-orders
   */
  @Post('purchase-orders')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROCUREMENT', 'EMPLOYEE')
  async createPurchaseOrder(@Body() createDto: any, @CurrentUser() user: JwtPayload) {
    return this.clientVendorService.createPurchaseOrder(createDto, user.userId);
  }

  /**
   * Get purchase order by ID
   * GET /clients-vendors/purchase-orders/:id
   */
  @Get('purchase-orders/:id')
  async getPurchaseOrder(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeItems', new ParseBoolPipe({ optional: true })) includeItems = false,
  ) {
    return this.clientVendorService.getPurchaseOrderById(id, includeItems);
  }

  // ========== Vendor Rating Endpoints ==========

  /**
   * Add vendor rating
   * POST /clients-vendors/vendors/:vendorId/ratings
   */
  @Post('vendors/:vendorId/ratings')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROCUREMENT', 'EMPLOYEE')
  async addVendorRating(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body() ratingDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientVendorService.addVendorRating(vendorId, ratingDto, user.userId);
  }

  // ========== Vendor Certification Endpoints ==========

  /**
   * Add vendor certification
   * POST /clients-vendors/vendors/:vendorId/certifications
   */
  @Post('vendors/:vendorId/certifications')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROCUREMENT')
  async addVendorCertification(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body() certificationDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientVendorService.addVendorCertification(vendorId, certificationDto, user.userId);
  }

  // ========== Contract Endpoints ==========

  /**
   * Create a new contract
   * POST /clients-vendors/contracts
   */
  @Post('contracts')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'SALES', 'LEGAL')
  async createContract(@Body() createDto: any, @CurrentUser() user: JwtPayload) {
    return this.clientVendorService.createContract(createDto, user.userId);
  }

  /**
   * Get contract by ID
   * GET /clients-vendors/contracts/:id
   */
  @Get('contracts/:id')
  async getContract(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ) {
    return this.clientVendorService.getContractById(id, includeRelations);
  }
}
