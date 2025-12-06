import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { Organization, OrganizationType, OrganizationStatus } from '../entities/organization.entity';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationDetailResponseDto,
  OrganizationCreationResponseDto,
  OrganizationListResponseDto,
} from '../dto';
import { TenantContextService } from '../../tenants/services/tenant-context.service';
import { OrganizationStatsService } from './organization-stats.service';

/**
 * Organization Service
 * 
 * Provides business logic for organization operations:
 * - Organization creation
 * - Organization updates
 * - Organization deletion (soft delete)
 * - List organizations for tenant
 * - Set default organization
 * 
 * This service handles all organization management operations
 * within the current tenant context.
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly tenantContextService: TenantContextService,
    private readonly statsService: OrganizationStatsService,
  ) {}

  /**
   * Create a new organization
   * 
   * @param createDto - Organization creation data
   * @param createdBy - User ID who created the organization (optional)
   * @returns Created organization information
   */
  async create(
    createDto: CreateOrganizationDto,
    createdBy?: number,
  ): Promise<OrganizationCreationResponseDto> {
    this.logger.log(`Creating organization: ${createDto.organizationKey} (${createDto.name})`);

    // Validate organization key uniqueness
    await this.validateOrganizationKeyUnique(createDto.organizationKey);

    // Validate parent organization if provided
    if (createDto.parentOrganizationId) {
      await this.validateParentOrganization(createDto.parentOrganizationId);
    }

    // Validate default organization uniqueness if setting as default
    if (createDto.isDefault) {
      await this.validateDefaultOrganizationUniqueness();
    }

    try {
      // Create organization entity
      const organization = this.organizationRepository.create({
        organizationKey: createDto.organizationKey.trim().toLowerCase(),
        name: createDto.name.trim(),
        displayName: createDto.displayName?.trim() || null,
        description: createDto.description?.trim() || null,
        parentOrganizationId: createDto.parentOrganizationId || null,
        organizationType: createDto.organizationType || OrganizationType.COMPANY,
        status: createDto.status || OrganizationStatus.ACTIVE,
        addressLine1: createDto.addressLine1?.trim() || null,
        addressLine2: createDto.addressLine2?.trim() || null,
        city: createDto.city?.trim() || null,
        state: createDto.state?.trim() || null,
        postalCode: createDto.postalCode?.trim() || null,
        country: createDto.country?.trim() || null,
        phone: createDto.phone?.trim() || null,
        email: createDto.email?.trim().toLowerCase() || null,
        website: createDto.website?.trim() || null,
        taxId: createDto.taxId?.trim() || null,
        registrationNumber: createDto.registrationNumber?.trim() || null,
        isDefault: createDto.isDefault || false,
        createdBy: createdBy || null,
        updatedBy: createdBy || null,
      });

      // If setting as default, unset other default organizations
      if (organization.isDefault) {
        await this.unsetOtherDefaultOrganizations();
      }

      // Save organization
      const savedOrganization = await this.organizationRepository.save(organization);

      this.logger.log(
        `Successfully created organization: ${savedOrganization.organizationKey} (ID: ${savedOrganization.id})`,
      );

      return {
        organization: this.toOrganizationResponse(savedOrganization),
        message: `Organization '${savedOrganization.name}' created successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create organization: ${createDto.organizationKey}`,
        error instanceof Error ? error.stack : String(error),
      );

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException(
        `Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all organizations with pagination and filtering
   * 
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param includeInactive - Include inactive organizations (default: false)
   * @param filters - Additional filters (parentId, type, status, search)
   * @returns Paginated list of organizations
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    includeInactive: boolean = false,
    filters?: {
      parentId?: number | null;
      type?: OrganizationType;
      status?: OrganizationStatus;
      search?: string;
    },
  ): Promise<OrganizationListResponseDto> {
    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.organizationRepository.findWithPagination(
      page,
      limit,
      includeInactive,
      filters,
    );

    const organizations = result.organizations.map((org) =>
      this.toOrganizationResponse(org),
    );

    const totalPages = Math.ceil(result.total / limit);

    return {
      organizations,
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get organization by ID
   * 
   * @param id - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Organization details
   * @throws NotFoundException if organization not found
   */
  async findOne(
    id: number,
    includeInactive: boolean = false,
  ): Promise<OrganizationDetailResponseDto> {
    const organization = includeInactive
      ? await this.organizationRepository.findByIdIncludeInactive(id)
      : await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Get parent organization if exists
    let parentOrganization: OrganizationResponseDto | null = null;
    if (organization.parentOrganizationId) {
      const parent = await this.organizationRepository.findById(
        organization.parentOrganizationId,
        includeInactive,
      );
      if (parent) {
        parentOrganization = this.toOrganizationResponse(parent);
      }
    }

    // Get child organization count
    const childCount = await this.organizationRepository
      .createQueryBuilder('org')
      .where('org.parentOrganizationId = :parentId', { parentId: id })
      .getCount();

    // Get member count
    const memberCount = await this.statsService.getUserCount(id, includeInactive);

    return {
      ...this.toOrganizationResponse(organization),
      parentOrganization,
      childOrganizationCount: childCount,
      memberCount,
    };
  }

  /**
   * Get organization by organization key
   * 
   * @param organizationKey - Organization key
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Organization details
   * @throws NotFoundException if organization not found
   */
  async findByKey(
    organizationKey: string,
    includeInactive: boolean = false,
  ): Promise<OrganizationDetailResponseDto> {
    const organization = await this.organizationRepository.findByKey(
      organizationKey,
      includeInactive,
    );

    if (!organization) {
      throw new NotFoundException(`Organization with key '${organizationKey}' not found`);
    }

    return this.findOne(organization.id, includeInactive);
  }

  /**
   * Update organization
   * 
   * @param id - Organization ID
   * @param updateDto - Organization update data
   * @param updatedBy - User ID who updated the organization (optional)
   * @returns Updated organization
   * @throws NotFoundException if organization not found
   */
  async update(
    id: number,
    updateDto: UpdateOrganizationDto,
    updatedBy?: number,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findByIdIncludeInactive(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Validate update operation
    await this.validateUpdate(organization, updateDto);

    // Update organization fields
    if (updateDto.name !== undefined) {
      organization.name = updateDto.name.trim();
    }

    if (updateDto.displayName !== undefined) {
      organization.displayName = updateDto.displayName?.trim() || null;
    }

    if (updateDto.description !== undefined) {
      organization.description = updateDto.description?.trim() || null;
    }

    if (updateDto.parentOrganizationId !== undefined) {
      // Validate parent organization
      if (updateDto.parentOrganizationId !== null) {
        await this.validateParentOrganization(updateDto.parentOrganizationId, id);
      }
      organization.parentOrganizationId = updateDto.parentOrganizationId;
    }

    if (updateDto.organizationType !== undefined) {
      organization.organizationType = updateDto.organizationType;
    }

    if (updateDto.status !== undefined) {
      organization.status = updateDto.status;
    }

    // Update address fields
    if (updateDto.addressLine1 !== undefined) {
      organization.addressLine1 = updateDto.addressLine1?.trim() || null;
    }
    if (updateDto.addressLine2 !== undefined) {
      organization.addressLine2 = updateDto.addressLine2?.trim() || null;
    }
    if (updateDto.city !== undefined) {
      organization.city = updateDto.city?.trim() || null;
    }
    if (updateDto.state !== undefined) {
      organization.state = updateDto.state?.trim() || null;
    }
    if (updateDto.postalCode !== undefined) {
      organization.postalCode = updateDto.postalCode?.trim() || null;
    }
    if (updateDto.country !== undefined) {
      organization.country = updateDto.country?.trim() || null;
    }

    // Update contact fields
    if (updateDto.phone !== undefined) {
      organization.phone = updateDto.phone?.trim() || null;
    }
    if (updateDto.email !== undefined) {
      organization.email = updateDto.email?.trim().toLowerCase() || null;
    }
    if (updateDto.website !== undefined) {
      organization.website = updateDto.website?.trim() || null;
    }

    // Update business fields
    if (updateDto.taxId !== undefined) {
      organization.taxId = updateDto.taxId?.trim() || null;
    }
    if (updateDto.registrationNumber !== undefined) {
      organization.registrationNumber = updateDto.registrationNumber?.trim() || null;
    }

    // Handle default organization flag
    if (updateDto.isDefault !== undefined) {
      if (updateDto.isDefault && !organization.isDefault) {
        // Setting as default - unset other defaults
        await this.unsetOtherDefaultOrganizations();
      }
      organization.isDefault = updateDto.isDefault;
    }

    // Update audit fields
    organization.updatedBy = updatedBy || null;

    // Save updated organization
    const updatedOrganization = await this.organizationRepository.save(organization);

    this.logger.log(
      `Updated organization: ${updatedOrganization.organizationKey} (ID: ${updatedOrganization.id})`,
    );

    return this.toOrganizationResponse(updatedOrganization);
  }

  /**
   * Delete organization (soft delete)
   * Marks organization as ARCHIVED status
   * 
   * @param id - Organization ID
   * @param deletedBy - User ID who deleted the organization (optional)
   * @returns Deleted organization
   * @throws NotFoundException if organization not found
   */
  async delete(id: number, deletedBy?: number): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findByIdIncludeInactive(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Check if organization has children
    const hasChildren = await this.organizationRepository.hasChildren(id);
    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete organization with child organizations. Please delete or reassign child organizations first.',
      );
    }

    // Soft delete by setting status to ARCHIVED
    organization.status = OrganizationStatus.ARCHIVED;
    organization.updatedBy = deletedBy || null;

    // If this was the default organization, unset the flag
    if (organization.isDefault) {
      organization.isDefault = false;
    }

    const deletedOrganization = await this.organizationRepository.save(organization);

    this.logger.log(
      `Deleted organization: ${deletedOrganization.organizationKey} (ID: ${deletedOrganization.id})`,
    );

    return this.toOrganizationResponse(deletedOrganization);
  }

  /**
   * Set default organization
   * Unsets other default organizations and sets the specified one as default
   * 
   * @param id - Organization ID
   * @param updatedBy - User ID who updated the organization (optional)
   * @returns Updated organization
   * @throws NotFoundException if organization not found
   */
  async setDefault(id: number, updatedBy?: number): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (organization.isDefault) {
      this.logger.warn(`Organization ${id} is already the default organization`);
      return this.toOrganizationResponse(organization);
    }

    // Unset other default organizations
    await this.unsetOtherDefaultOrganizations();

    // Set this organization as default
    organization.isDefault = true;
    organization.updatedBy = updatedBy || null;

    const updatedOrganization = await this.organizationRepository.save(organization);

    this.logger.log(
      `Set default organization: ${updatedOrganization.organizationKey} (ID: ${updatedOrganization.id})`,
    );

    return this.toOrganizationResponse(updatedOrganization);
  }

  /**
   * Get default organization
   * 
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Default organization or null if none exists
   */
  async getDefault(includeInactive = false): Promise<OrganizationResponseDto | null> {
    const organization = await this.organizationRepository.findDefault(includeInactive);

    if (!organization) {
      return null;
    }

    return this.toOrganizationResponse(organization);
  }

  /**
   * Get root organizations (organizations with no parent)
   * 
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns List of root organizations
   */
  async getRootOrganizations(
    includeInactive = false,
  ): Promise<OrganizationResponseDto[]> {
    const organizations = await this.organizationRepository.findRootOrganizations(
      includeInactive,
    );

    return organizations.map((org) => this.toOrganizationResponse(org));
  }

  /**
   * Validate organization key is unique
   * 
   * @param organizationKey - Organization key to validate
   * @throws ConflictException if organization key already exists
   */
  private async validateOrganizationKeyUnique(organizationKey: string): Promise<void> {
    const normalizedKey = organizationKey.trim().toLowerCase();
    const exists = await this.organizationRepository.organizationKeyExists(normalizedKey);

    if (exists) {
      throw new ConflictException(
        `Organization with key '${normalizedKey}' already exists`,
      );
    }
  }

  /**
   * Validate parent organization exists and is valid
   * 
   * @param parentId - Parent organization ID
   * @param excludeId - Organization ID to exclude from validation (for updates)
   * @throws NotFoundException if parent not found
   * @throws BadRequestException if parent is invalid
   */
  private async validateParentOrganization(
    parentId: number,
    excludeId?: number,
  ): Promise<void> {
    const parent = await this.organizationRepository.findByIdIncludeInactive(parentId);

    if (!parent) {
      throw new NotFoundException(`Parent organization with ID ${parentId} not found`);
    }

    if (parent.status !== OrganizationStatus.ACTIVE) {
      throw new BadRequestException(
        'Parent organization must be active',
      );
    }

    // Prevent setting organization as its own parent
    if (excludeId && parentId === excludeId) {
      throw new BadRequestException(
        'Organization cannot be its own parent',
      );
    }

    // Prevent circular references (check if parent is a descendant)
    if (excludeId) {
      const ancestors = await this.organizationRepository.findAncestors(excludeId);
      if (ancestors.some((ancestor) => ancestor.id === parentId)) {
        throw new BadRequestException(
          'Cannot set parent organization: would create a circular reference',
        );
      }
    }
  }

  /**
   * Validate default organization uniqueness
   * Ensures only one default organization exists per tenant
   */
  private async validateDefaultOrganizationUniqueness(): Promise<void> {
    const existingDefault = await this.organizationRepository.findDefault(true);

    if (existingDefault) {
      throw new ConflictException(
        `Default organization already exists: ${existingDefault.name} (ID: ${existingDefault.id})`,
      );
    }
  }

  /**
   * Unset all default organizations
   * Used when setting a new default organization
   */
  private async unsetOtherDefaultOrganizations(): Promise<void> {
    const defaultOrg = await this.organizationRepository.findDefault(true);

    if (defaultOrg) {
      defaultOrg.isDefault = false;
      await this.organizationRepository.save(defaultOrg);
    }
  }

  /**
   * Validate organization update operation
   * 
   * @param organization - Current organization entity
   * @param updateDto - Update data
   */
  private async validateUpdate(
    organization: Organization,
    updateDto: UpdateOrganizationDto,
  ): Promise<void> {
    // Validate name if provided
    if (updateDto.name !== undefined) {
      if (!updateDto.name || updateDto.name.trim().length === 0) {
        throw new BadRequestException('Organization name cannot be empty');
      }

      if (updateDto.name.trim().length > 255) {
        throw new BadRequestException('Organization name must not exceed 255 characters');
      }
    }
  }

  /**
   * Convert organization entity to OrganizationResponseDto
   */
  private toOrganizationResponse(organization: Organization): OrganizationResponseDto {
    return {
      id: organization.id,
      organizationKey: organization.organizationKey,
      name: organization.name,
      displayName: organization.displayName,
      description: organization.description,
      parentOrganizationId: organization.parentOrganizationId,
      organizationType: organization.organizationType,
      status: organization.status,
      addressLine1: organization.addressLine1,
      addressLine2: organization.addressLine2,
      city: organization.city,
      state: organization.state,
      postalCode: organization.postalCode,
      country: organization.country,
      phone: organization.phone,
      email: organization.email,
      website: organization.website,
      taxId: organization.taxId,
      registrationNumber: organization.registrationNumber,
      isDefault: organization.isDefault,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    };
  }
}

