import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { TenantsService } from './services/tenants.service';
import { FixTenantAdminService } from './services/fix-tenant-admin.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  TenantDetailResponseDto,
  TenantCreationResponseDto,
} from './dto';

/**
 * Tenant Management Controller
 *
 * Handles tenant management operations (super admin only):
 * - POST /admin/tenants - Create tenant
 * - GET /admin/tenants - List tenants
 * - GET /admin/tenants/:id - Get tenant details
 * - PUT /admin/tenants/:id - Update tenant (full/partial update)
 * - PATCH /admin/tenants/:id - Update tenant (partial update)
 */
@Controller('admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TransformInterceptor)
@Roles('SUPER_ADMIN')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly fixTenantAdminService: FixTenantAdminService,
  ) {}

  /**
   * Create a new tenant
   *
   * This endpoint:
   * 1. Provisions the tenant (creates schema, runs migrations, creates tenant record)
   * 2. Initializes the tenant (creates default roles, tenant admin user, default organization)
   *
   * @param createTenantDto - Tenant creation data
   * @param user - Current user (super admin)
   * @returns Created tenant information
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantCreationResponseDto> {
    return this.tenantsService.createTenant(createTenantDto);
  }

  /**
   * List all tenants
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param includeInactive - Include inactive tenants (default: false)
   * @param search - Search term for tenant name or key
   * @returns Paginated list of tenants
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listTenants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('search') search?: string,
  ): Promise<{
    tenants: TenantResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const includeInactiveFlag = includeInactive === 'true';

    return this.tenantsService.findAll(pageNum, limitNum, includeInactiveFlag, search);
  }

  /**
   * Get tenant details by ID
   *
   * @param id - Tenant ID
   * @returns Tenant details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTenant(@Param('id', ParseIntPipe) id: number): Promise<TenantDetailResponseDto> {
    return this.tenantsService.findOne(id, true);
  }

  /**
   * Update tenant (PUT - supports both full and partial updates)
   *
   * @param id - Tenant ID
   * @param updateTenantDto - Tenant update data
   * @returns Updated tenant
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateTenantPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  /**
   * Update tenant (PATCH - partial update)
   *
   * @param id - Tenant ID
   * @param updateTenantDto - Tenant update data
   * @returns Updated tenant
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  /**
   * Fix tenant admin record for existing tenant
   * This endpoint fixes tenants that were created before tenant admin record creation was added
   *
   * @param id - Tenant ID
   * @param body - Tenant admin credentials
   * @returns Success message
   */
  @Post(':id/fix-admin')
  @HttpCode(HttpStatus.OK)
  async fixTenantAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { email: string; password: string },
  ): Promise<{ success: boolean; message: string }> {
    const tenant = await this.tenantsService.findOne(id, true);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }

    const fixed = await this.fixTenantAdminService.fixTenantAdmin(
      tenant.tenantKey,
      body.email,
      body.password,
    );

    if (fixed) {
      return {
        success: true,
        message: `Successfully created tenant admin record for ${body.email}`,
      };
    } else {
      return {
        success: false,
        message: `Tenant admin record already exists or tenant/user not found`,
      };
    }
  }
}
