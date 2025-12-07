import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { OrganizationsService } from './services/organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationDetailResponseDto,
  OrganizationCreationResponseDto,
  OrganizationListResponseDto,
} from './dto';
import { OrganizationType, OrganizationStatus } from './entities/organization.entity';

/**
 * Organization Management Controller
 *
 * Handles organization management operations within a tenant:
 * - POST /organizations - Create organization
 * - GET /organizations - List organizations
 * - GET /organizations/:id - Get organization
 * - PATCH /organizations/:id - Update organization
 * - DELETE /organizations/:id - Delete organization
 * - POST /organizations/:id/set-default - Set default organization
 *
 * All endpoints require JWT authentication and operate within the tenant context.
 */
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Create a new organization
   *
   * Creates a new organization within the current tenant context.
   * The organization key must be unique within the tenant.
   *
   * @param createDto - Organization creation data
   * @param user - Current user (from JWT token)
   * @returns Created organization information
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @Body() createDto: CreateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationCreationResponseDto> {
    return this.organizationsService.create(createDto, user.userId);
  }

  /**
   * List all organizations
   *
   * Returns a paginated list of organizations for the current tenant.
   * Supports filtering by parent organization, type, status, and search term.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @param includeInactive - Include inactive organizations (default: false)
   * @param parentId - Filter by parent organization ID (optional)
   * @param type - Filter by organization type (optional)
   * @param status - Filter by organization status (optional)
   * @param search - Search term for organization name or key (optional)
   * @returns Paginated list of organizations
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listOrganizations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
    @Query('parentId') parentId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<OrganizationListResponseDto> {
    // Parse optional filters
    const filters: {
      parentId?: number | null;
      type?: OrganizationType;
      status?: OrganizationStatus;
      search?: string;
    } = {};

    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '') {
        filters.parentId = null;
      } else {
        const parsedParentId = parseInt(parentId, 10);
        if (!isNaN(parsedParentId)) {
          filters.parentId = parsedParentId;
        }
      }
    }

    if (type) {
      const orgType = Object.values(OrganizationType).find(
        (t) => t.toLowerCase() === type.toLowerCase(),
      );
      if (orgType) {
        filters.type = orgType;
      }
    }

    if (status) {
      const orgStatus = Object.values(OrganizationStatus).find(
        (s) => s.toLowerCase() === status.toLowerCase(),
      );
      if (orgStatus) {
        filters.status = orgStatus;
      }
    }

    if (search && search.trim().length > 0) {
      filters.search = search.trim();
    }

    return this.organizationsService.findAll(page, limit, includeInactive, filters);
  }

  /**
   * Get organization by ID
   *
   * Returns detailed information about a specific organization,
   * including parent organization details and child/member counts.
   *
   * @param id - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Organization details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOrganization(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
  ): Promise<OrganizationDetailResponseDto> {
    return this.organizationsService.findOne(id, includeInactive);
  }

  /**
   * Update organization
   *
   * Updates organization information. Only provided fields will be updated.
   * Validates parent organization relationships and prevents circular references.
   *
   * @param id - Organization ID
   * @param updateDto - Organization update data
   * @param user - Current user (from JWT token)
   * @returns Updated organization
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateOrganization(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, updateDto, user.userId);
  }

  /**
   * Delete organization (soft delete)
   *
   * Soft deletes an organization by setting its status to ARCHIVED.
   * Cannot delete organizations that have child organizations.
   *
   * @param id - Organization ID
   * @param user - Current user (from JWT token)
   * @returns Deleted organization
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteOrganization(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.delete(id, user.userId);
  }

  /**
   * Set default organization
   *
   * Sets the specified organization as the default organization for the tenant.
   * Automatically unsets any other default organization.
   *
   * @param id - Organization ID
   * @param user - Current user (from JWT token)
   * @returns Updated organization
   */
  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefaultOrganization(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.setDefault(id, user.userId);
  }
}

