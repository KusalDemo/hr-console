import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantInitializationService } from './tenant-initialization.service';
import { EmailService } from '../../email/email.service';
import { Tenant } from '../../admin/entities/tenant.entity';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  TenantDetailResponseDto,
  TenantCreationResponseDto,
} from '../dto';
import { ErrorCode } from '../../common/exceptions/business.exception';

/**
 * Tenant Service
 *
 * Provides business logic for tenant operations:
 * - Tenant creation (orchestrates provisioning and initialization)
 * - Tenant validation
 * - Tenant status management
 * - Tenant querying and updates
 *
 * This service acts as a facade for tenant-related operations,
 * coordinating between provisioning, initialization, and repository services.
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantProvisioningService: TenantProvisioningService,
    private readonly tenantInitializationService: TenantInitializationService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create a new tenant
   *
   * This method orchestrates the complete tenant creation process:
   * 1. Validates tenant creation request
   * 2. Provisions tenant (schema, migrations, tenant record)
   * 3. Initializes tenant (roles, admin user, default organization)
   *
   * @param createTenantDto - Tenant creation data
   * @returns Created tenant information
   */
  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantCreationResponseDto> {
    this.logger.log(`Creating tenant: ${createTenantDto.tenantKey} (${createTenantDto.name})`);

    // Validate tenant key uniqueness
    await this.validateTenantKeyUnique(createTenantDto.tenantKey);

    try {
      // Step 1: Provision tenant (create schema, run migrations, create tenant record)
      const tenant = await this.tenantProvisioningService.provisionTenant(
        createTenantDto.tenantKey,
        createTenantDto.name,
      );

      // Step 2: Initialize tenant (create default roles, tenant admin user, default organization)
      await this.tenantInitializationService.initializeTenant(
        tenant,
        createTenantDto.tenantAdminEmail,
        createTenantDto.tenantAdminPassword,
        createTenantDto.tenantAdminFullName,
      );

      this.logger.log(`Successfully created tenant: ${tenant.tenantKey} (ID: ${tenant.id})`);

      // Step 3: Send welcome email to tenant admin (non-blocking)
      let emailSent = false;
      let emailError: string | undefined;
      try {
        await this.emailService.sendTenantAdminWelcomeEmail({
          tenantAdminName: createTenantDto.tenantAdminFullName,
          tenantAdminEmail: createTenantDto.tenantAdminEmail,
          tenantAdminPassword: createTenantDto.tenantAdminPassword,
          tenantName: tenant.name,
          tenantKey: tenant.tenantKey,
          organizationName: tenant.name, // Default organization uses tenant name
        });
        emailSent = true;
        this.logger.log(`Welcome email sent successfully to ${createTenantDto.tenantAdminEmail}`);
      } catch (error) {
        emailError = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to send welcome email to ${createTenantDto.tenantAdminEmail}: ${emailError}`,
          error instanceof Error ? error.stack : String(error),
        );
        // Don't fail tenant creation if email fails - just log the error
      }

      // Convert to response DTO
      return this.toTenantCreationResponse(
        tenant,
        createTenantDto.tenantAdminEmail,
        emailSent,
        emailError,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create tenant: ${createTenantDto.tenantKey}`,
        error instanceof Error ? error.stack : String(error),
      );

      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all tenants with pagination and filtering
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param includeInactive - Include inactive tenants (default: false)
   * @param search - Search term for tenant name or key
   * @returns Paginated list of tenants
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    includeInactive: boolean = false,
    search?: string,
  ): Promise<{
    tenants: TenantResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    let tenants: Tenant[];
    let total: number;

    if (search) {
      // Search tenants by name or key
      tenants = await this.tenantRepository.search(search, includeInactive);
      total = tenants.length;
    } else {
      // Get paginated tenants
      const result = await this.tenantRepository.findWithPagination(page, limit, includeInactive);
      tenants = result.tenants;
      total = result.total;
    }

    // Convert to response DTOs
    const tenantResponses = tenants.map((tenant) => this.toTenantResponse(tenant));

    const totalPages = Math.ceil(total / limit);

    return {
      tenants: tenantResponses,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get tenant by ID
   *
   * @param id - Tenant ID
   * @param includeInactive - Include inactive tenants (default: false)
   * @returns Tenant details
   * @throws NotFoundException if tenant not found
   */
  async findOne(id: number, includeInactive: boolean = false): Promise<TenantDetailResponseDto> {
    const tenant = includeInactive
      ? await this.tenantRepository.findByIdIncludeInactive(id)
      : await this.tenantRepository.findById(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return this.toTenantDetailResponse(tenant);
  }

  /**
   * Get tenant by tenant key
   *
   * @param tenantKey - Tenant key
   * @param includeInactive - Include inactive tenants (default: false)
   * @returns Tenant details
   * @throws NotFoundException if tenant not found
   */
  async findByTenantKey(
    tenantKey: string,
    includeInactive: boolean = false,
  ): Promise<TenantDetailResponseDto> {
    const tenant = await this.tenantRepository.findByTenantKey(tenantKey, includeInactive);

    if (!tenant) {
      throw new NotFoundException(`Tenant with key '${tenantKey}' not found`);
    }

    return this.toTenantDetailResponse(tenant);
  }

  /**
   * Update tenant
   *
   * @param id - Tenant ID
   * @param updateTenantDto - Tenant update data
   * @returns Updated tenant
   * @throws NotFoundException if tenant not found
   */
  async update(id: number, updateTenantDto: UpdateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findByIdIncludeInactive(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Validate update operation
    this.validateUpdate(tenant, updateTenantDto);

    // Update tenant fields
    if (updateTenantDto.name !== undefined) {
      tenant.name = updateTenantDto.name.trim();
    }

    // Support both 'active' and 'isActive' property names
    const isActiveValue =
      updateTenantDto.isActive !== undefined ? updateTenantDto.isActive : updateTenantDto.active;

    if (isActiveValue !== undefined) {
      // Validate status change
      this.validateStatusChange(tenant, isActiveValue);
      tenant.isActive = isActiveValue;
    }

    // Save updated tenant
    const updatedTenant = await this.tenantRepository.save(tenant);

    this.logger.log(`Updated tenant: ${updatedTenant.tenantKey} (ID: ${updatedTenant.id})`);

    return this.toTenantResponse(updatedTenant);
  }

  /**
   * Activate tenant
   *
   * @param id - Tenant ID
   * @returns Activated tenant
   * @throws NotFoundException if tenant not found
   */
  async activate(id: number): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findByIdIncludeInactive(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    if (tenant.isActive) {
      this.logger.warn(`Tenant ${id} is already active`);
      return this.toTenantResponse(tenant);
    }

    await this.tenantRepository.activateTenant(id);
    const updatedTenant = await this.tenantRepository.findById(id);

    if (!updatedTenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found after activation`);
    }

    this.logger.log(`Activated tenant: ${updatedTenant.tenantKey} (ID: ${updatedTenant.id})`);

    return this.toTenantResponse(updatedTenant);
  }

  /**
   * Deactivate tenant
   *
   * @param id - Tenant ID
   * @returns Deactivated tenant
   * @throws NotFoundException if tenant not found
   */
  async deactivate(id: number): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findById(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    if (!tenant.isActive) {
      this.logger.warn(`Tenant ${id} is already inactive`);
      return this.toTenantResponse(tenant);
    }

    await this.tenantRepository.deactivateTenant(id);
    const updatedTenant = await this.tenantRepository.findByIdIncludeInactive(id);

    if (!updatedTenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found after deactivation`);
    }

    this.logger.log(`Deactivated tenant: ${updatedTenant.tenantKey} (ID: ${updatedTenant.id})`);

    return this.toTenantResponse(updatedTenant);
  }

  /**
   * Validate tenant key is unique
   *
   * @param tenantKey - Tenant key to validate
   * @throws ConflictException if tenant key already exists
   */
  private async validateTenantKeyUnique(tenantKey: string): Promise<void> {
    const normalizedKey = tenantKey.trim().toLowerCase();
    const exists = await this.tenantRepository.tenantKeyExists(normalizedKey);

    if (exists) {
      throw new ConflictException(`Tenant with key '${normalizedKey}' already exists`);
    }
  }

  /**
   * Validate tenant update operation
   *
   * @param tenant - Current tenant entity
   * @param updateDto - Update data
   */
  private validateUpdate(tenant: Tenant, updateDto: UpdateTenantDto): void {
    // Validate name if provided
    if (updateDto.name !== undefined) {
      if (!updateDto.name || updateDto.name.trim().length === 0) {
        throw new BadRequestException('Tenant name cannot be empty');
      }

      if (updateDto.name.trim().length > 255) {
        throw new BadRequestException('Tenant name must not exceed 255 characters');
      }
    }
  }

  /**
   * Validate tenant status change
   *
   * @param tenant - Current tenant entity
   * @param newStatus - New active status
   */
  private validateStatusChange(tenant: Tenant, newStatus: boolean): void {
    // Additional validation can be added here
    // For example: check subscription status before deactivating
    // This will be implemented in Phase 5 when subscription system is ready

    if (!newStatus && tenant.isActive) {
      this.logger.warn(`Deactivating tenant: ${tenant.tenantKey} (ID: ${tenant.id})`);
      // TODO: Check subscription status in Phase 5
      // TODO: Notify tenant admin about deactivation
    }

    if (newStatus && !tenant.isActive) {
      this.logger.log(`Reactivating tenant: ${tenant.tenantKey} (ID: ${tenant.id})`);
      // TODO: Validate subscription is active in Phase 5
    }
  }

  /**
   * Convert tenant entity to TenantResponseDto
   */
  private toTenantResponse(tenant: Tenant): TenantResponseDto {
    return {
      id: tenant.id,
      tenantKey: tenant.tenantKey,
      name: tenant.name,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  /**
   * Convert tenant entity to TenantDetailResponseDto
   */
  private toTenantDetailResponse(tenant: Tenant): TenantDetailResponseDto {
    return {
      id: tenant.id,
      tenantKey: tenant.tenantKey,
      name: tenant.name,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  /**
   * Convert tenant entity to TenantCreationResponseDto
   */
  private toTenantCreationResponse(
    tenant: Tenant,
    tenantAdminEmail: string,
    emailSent: boolean = false,
    emailError?: string,
  ): TenantCreationResponseDto {
    return {
      tenant: this.toTenantResponse(tenant),
      message: `Tenant '${tenant.tenantKey}' created successfully`,
      tenantAdminEmail,
      emailSent,
      emailError,
    };
  }
}
