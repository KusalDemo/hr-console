import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ResourceRepository } from '../repositories/resource.repository';
import { Resource, ResourceType, ResourceStatus } from '../entities/resource.entity';

/**
 * Resource Service
 *
 * Manages resources with:
 * - Resource CRUD operations
 * - Availability checking
 * - Resource search and filtering
 * - Maintenance scheduling
 */
@Injectable()
export class ResourceService {
  private readonly logger = new Logger(ResourceService.name);

  constructor(private readonly resourceRepository: ResourceRepository) {}

  /**
   * Create a new resource
   */
  async createResource(createDto: any, createdBy?: number): Promise<Resource> {
    const resource = this.resourceRepository.create({
      ...createDto,
      resourceType: createDto.resourceType || ResourceType.ROOM,
      resourceStatus: createDto.resourceStatus || ResourceStatus.AVAILABLE,
      isActive: true,
      createdBy,
    });

    const saved = await this.resourceRepository.save(resource);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Created resource: ${savedEntity.id} (${savedEntity.resourceName})`);

    return savedEntity;
  }

  /**
   * Get resource by ID
   */
  async getResourceById(id: number, includeBookings = false): Promise<Resource> {
    const resource = await this.resourceRepository.findById(id, includeBookings);

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    return resource;
  }

  /**
   * Update resource
   */
  async updateResource(id: number, updateDto: any, updatedBy?: number): Promise<Resource> {
    const resource = await this.resourceRepository.findById(id);

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    Object.assign(resource, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.resourceRepository.save(resource);

    this.logger.log(`Updated resource: ${id}`);

    return saved;
  }

  /**
   * Delete resource (soft delete by setting isActive = false)
   */
  async deleteResource(id: number, updatedBy?: number): Promise<void> {
    const resource = await this.resourceRepository.findById(id);

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    resource.isActive = false;
    resource.updatedBy = updatedBy ?? null;

    await this.resourceRepository.save(resource);

    this.logger.log(`Deleted resource: ${id}`);
  }

  /**
   * Get resources by type
   */
  async getResourcesByType(
    type: ResourceType,
    organizationId?: number,
    includeInactive = false,
  ): Promise<Resource[]> {
    return this.resourceRepository.findByType(type, organizationId, includeInactive);
  }

  /**
   * Get resources by status
   */
  async getResourcesByStatus(status: ResourceStatus, organizationId?: number): Promise<Resource[]> {
    return this.resourceRepository.findByStatus(status, organizationId);
  }

  /**
   * Get resources by category
   */
  async getResourcesByCategory(category: string, organizationId?: number): Promise<Resource[]> {
    return this.resourceRepository.findByCategory(category, organizationId);
  }

  /**
   * Get resources by location
   */
  async getResourcesByLocation(locationId: number, organizationId?: number): Promise<Resource[]> {
    return this.resourceRepository.findByLocation(locationId, organizationId);
  }

  /**
   * Search resources
   */
  async searchResources(filters: {
    searchTerm?: string;
    resourceType?: ResourceType;
    category?: string;
    locationId?: number;
    organizationId?: number;
    minCapacity?: number;
    hasFeatures?: string[];
  }): Promise<Resource[]> {
    return this.resourceRepository.searchResources(
      filters.searchTerm,
      filters.resourceType,
      filters.category,
      filters.locationId,
      filters.organizationId,
      filters.minCapacity,
      filters.hasFeatures,
    );
  }

  /**
   * Check resource availability
   */
  async checkAvailability(
    resourceId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<{ available: boolean; reason?: string }> {
    const resource = await this.resourceRepository.findById(resourceId);

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${resourceId} not found`);
    }

    // Check if resource is active and available
    if (!resource.isActive) {
      return { available: false, reason: 'Resource is not active' };
    }

    if (resource.resourceStatus !== ResourceStatus.AVAILABLE) {
      return { available: false, reason: `Resource status is ${resource.resourceStatus}` };
    }

    // Check maintenance schedule
    if (resource.nextMaintenanceDate) {
      const maintenanceDate = new Date(resource.nextMaintenanceDate);
      if (startTime <= maintenanceDate && endTime >= maintenanceDate) {
        return { available: false, reason: 'Resource is scheduled for maintenance' };
      }
    }

    // Check availability rules
    if (resource.availabilityRules) {
      const dayOfWeek = startTime.getDay();
      const rules = resource.availabilityRules;

      if (rules.days && !rules.days.includes(dayOfWeek)) {
        return { available: false, reason: 'Resource not available on this day' };
      }

      if (rules.startTime && rules.endTime) {
        const startHour = startTime.getHours();
        const startMinute = startTime.getMinutes();
        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();

        const [ruleStartHour, ruleStartMinute] = rules.startTime.split(':').map(Number);
        const [ruleEndHour, ruleEndMinute] = rules.endTime.split(':').map(Number);

        const bookingStartMinutes = startHour * 60 + startMinute;
        const bookingEndMinutes = endHour * 60 + endMinute;
        const ruleStartMinutes = ruleStartHour * 60 + ruleStartMinute;
        const ruleEndMinutes = ruleEndHour * 60 + ruleEndMinute;

        if (bookingStartMinutes < ruleStartMinutes || bookingEndMinutes > ruleEndMinutes) {
          return {
            available: false,
            reason: `Resource only available between ${rules.startTime} and ${rules.endTime}`,
          };
        }
      }
    }

    // Check advance booking limits
    if (resource.maxAdvanceBookingDays) {
      const maxBookingDate = new Date();
      maxBookingDate.setDate(maxBookingDate.getDate() + resource.maxAdvanceBookingDays);

      if (startTime > maxBookingDate) {
        return {
          available: false,
          reason: `Cannot book more than ${resource.maxAdvanceBookingDays} days in advance`,
        };
      }
    }

    return { available: true };
  }

  /**
   * Get available resources for time range
   */
  async getAvailableResources(
    startTime: Date,
    endTime: Date,
    filters?: {
      resourceType?: ResourceType;
      organizationId?: number;
      minCapacity?: number;
    },
  ): Promise<Resource[]> {
    return this.resourceRepository.findAvailableResources(
      startTime,
      endTime,
      filters?.resourceType,
      filters?.organizationId,
      filters?.minCapacity,
    );
  }

  /**
   * Update resource status
   */
  async updateResourceStatus(
    id: number,
    status: ResourceStatus,
    updatedBy?: number,
  ): Promise<Resource> {
    const resource = await this.resourceRepository.findById(id);

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    resource.resourceStatus = status;
    resource.updatedBy = updatedBy ?? null;

    return this.resourceRepository.save(resource);
  }

  /**
   * Schedule maintenance
   */
  async scheduleMaintenance(
    id: number,
    nextMaintenanceDate: Date,
    maintenanceSchedule?: Record<string, any>,
    updatedBy?: number,
  ): Promise<Resource> {
    const resource = await this.resourceRepository.findById(id);

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    resource.nextMaintenanceDate = nextMaintenanceDate;
    if (maintenanceSchedule) {
      resource.maintenanceSchedule = maintenanceSchedule;
    }
    resource.updatedBy = updatedBy ?? null;

    return this.resourceRepository.save(resource);
  }
}
