import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EquipmentRepository } from '../repositories/equipment.repository';
import { EquipmentAssignmentRepository } from '../repositories/equipment-assignment.repository';
import { EquipmentMaintenanceRepository } from '../repositories/equipment-maintenance.repository';
import {
  Equipment,
  EquipmentStatus,
} from '../entities/equipment.entity';
import {
  EquipmentAssignment,
  AssignmentStatus,
} from '../entities/equipment-assignment.entity';
import {
  EquipmentMaintenance,
  MaintenanceType,
  MaintenanceStatus,
} from '../entities/equipment-maintenance.entity';

/**
 * Equipment Service
 * 
 * Manages equipment with:
 * - Equipment CRUD operations
 * - Assignment tracking
 * - Maintenance scheduling
 * - Depreciation tracking
 * - Warranty management
 */
@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    private readonly equipmentRepository: EquipmentRepository,
    private readonly assignmentRepository: EquipmentAssignmentRepository,
    private readonly maintenanceRepository: EquipmentMaintenanceRepository,
  ) {}

  // ========== Equipment Methods ==========

  /**
   * Create a new equipment
   */
  async createEquipment(createDto: any, createdBy?: number): Promise<Equipment> {
    // Check if asset tag already exists
    const existing = await this.equipmentRepository.findByAssetTag(createDto.assetTag);
    if (existing) {
      throw new BadRequestException(`Equipment with asset tag ${createDto.assetTag} already exists`);
    }

    const equipment = this.equipmentRepository.create({
      ...createDto,
      equipmentStatus: createDto.equipmentStatus || EquipmentStatus.AVAILABLE,
      isActive: true,
      createdBy,
    });

    const saved = await this.equipmentRepository.save(equipment);

    this.logger.log(`Created equipment: ${saved.id} (${saved.assetTag})`);

    return saved;
  }

  /**
   * Get equipment by ID
   */
  async getEquipmentById(
    id: number,
    includeAssignments = false,
    includeMaintenance = false,
  ): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findById(
      id,
      includeAssignments,
      includeMaintenance,
    );

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    return equipment;
  }

  /**
   * Get equipment by asset tag
   */
  async getEquipmentByAssetTag(assetTag: string): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findByAssetTag(assetTag);

    if (!equipment) {
      throw new NotFoundException(`Equipment with asset tag ${assetTag} not found`);
    }

    return equipment;
  }

  /**
   * Update equipment
   */
  async updateEquipment(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findById(id);

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    // Check asset tag uniqueness if changing
    if (updateDto.assetTag && updateDto.assetTag !== equipment.assetTag) {
      const existing = await this.equipmentRepository.findByAssetTag(updateDto.assetTag);
      if (existing) {
        throw new BadRequestException(`Equipment with asset tag ${updateDto.assetTag} already exists`);
      }
    }

    Object.assign(equipment, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.equipmentRepository.save(equipment);

    this.logger.log(`Updated equipment: ${id}`);

    return saved;
  }

  /**
   * Update equipment status
   */
  async updateEquipmentStatus(
    id: number,
    status: EquipmentStatus,
    updatedBy?: number,
  ): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findById(id);

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    equipment.equipmentStatus = status;
    equipment.updatedBy = updatedBy;

    return this.equipmentRepository.save(equipment);
  }

  /**
   * Get equipment needing maintenance
   */
  async getEquipmentNeedingMaintenance(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<Equipment[]> {
    return this.equipmentRepository.findNeedingMaintenance(organizationId, beforeDate);
  }

  /**
   * Get equipment with expired warranty
   */
  async getEquipmentWithExpiredWarranty(organizationId?: number): Promise<Equipment[]> {
    return this.equipmentRepository.findWithExpiredWarranty(organizationId);
  }

  /**
   * Search equipment
   */
  async searchEquipment(filters: {
    searchTerm?: string;
    category?: string;
    equipmentType?: string;
    status?: EquipmentStatus;
    organizationId?: number;
  }): Promise<Equipment[]> {
    return this.equipmentRepository.searchEquipment(
      filters.searchTerm,
      filters.category,
      filters.equipmentType,
      filters.status,
      filters.organizationId,
    );
  }

  // ========== Assignment Methods ==========

  /**
   * Assign equipment to employee
   */
  async assignEquipment(
    equipmentId: number,
    employeeId: number,
    assignedById: number,
    assignmentData: {
      expectedReturnDate?: Date;
      assignmentNotes?: string;
      conditionAtAssignment?: string;
    },
    createdBy?: number,
  ): Promise<EquipmentAssignment> {
    const equipment = await this.equipmentRepository.findById(equipmentId);

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    if (equipment.equipmentStatus !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException(
        `Equipment is not available for assignment. Current status: ${equipment.equipmentStatus}`,
      );
    }

    // Check for active assignment
    const activeAssignment = await this.assignmentRepository.findActiveByEquipment(equipmentId);
    if (activeAssignment) {
      throw new BadRequestException('Equipment is already assigned');
    }

    const assignment = this.assignmentRepository.create({
      equipmentId,
      employeeId,
      assignedById,
      assignmentStatus: AssignmentStatus.ACTIVE,
      assignedDate: new Date(),
      ...assignmentData,
      createdBy,
    });

    const saved = await this.assignmentRepository.save(assignment);

    // Update equipment status
    equipment.equipmentStatus = EquipmentStatus.ASSIGNED;
    await this.equipmentRepository.save(equipment);

    this.logger.log(`Assigned equipment ${equipmentId} to employee ${employeeId}`);

    return saved;
  }

  /**
   * Return equipment
   */
  async returnEquipment(
    assignmentId: number,
    returnedById: number,
    returnData: {
      conditionAtReturn?: string;
      returnNotes?: string;
    },
    updatedBy?: number,
  ): Promise<EquipmentAssignment> {
    const assignment = await this.assignmentRepository.findById(assignmentId);

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    if (assignment.assignmentStatus !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException('Assignment is not active');
    }

    assignment.assignmentStatus = AssignmentStatus.RETURNED;
    assignment.actualReturnDate = new Date();
    assignment.returnedById = returnedById;
    assignment.conditionAtReturn = returnData.conditionAtReturn;
    assignment.returnNotes = returnData.returnNotes;
    assignment.updatedBy = updatedBy;

    const saved = await this.assignmentRepository.save(assignment);

    // Update equipment status
    const equipment = await this.equipmentRepository.findById(assignment.equipmentId);
    if (equipment) {
      equipment.equipmentStatus = EquipmentStatus.AVAILABLE;
      await this.equipmentRepository.save(equipment);
    }

    this.logger.log(`Returned equipment assignment ${assignmentId}`);

    return saved;
  }

  /**
   * Get assignments by employee
   */
  async getAssignmentsByEmployee(
    employeeId: number,
    includeReturned = false,
  ): Promise<EquipmentAssignment[]> {
    return this.assignmentRepository.findByEmployee(employeeId, includeReturned);
  }

  /**
   * Get assignments by equipment
   */
  async getAssignmentsByEquipment(equipmentId: number): Promise<EquipmentAssignment[]> {
    return this.assignmentRepository.findByEquipment(equipmentId);
  }

  // ========== Maintenance Methods ==========

  /**
   * Create maintenance record
   */
  async createMaintenance(
    equipmentId: number,
    maintenanceData: {
      maintenanceType: MaintenanceType;
      maintenanceTitle: string;
      maintenanceDescription?: string;
      scheduledDate: Date;
      technicianId?: number;
      vendor?: string;
      maintenanceCost?: number;
      partsReplaced?: Array<{ partName: string; partNumber?: string; cost?: number }>;
      maintenanceNotes?: string;
    },
    createdBy?: number,
  ): Promise<EquipmentMaintenance> {
    const equipment = await this.equipmentRepository.findById(equipmentId);

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    const maintenance = this.maintenanceRepository.create({
      equipmentId,
      ...maintenanceData,
      maintenanceStatus: MaintenanceStatus.SCHEDULED,
      createdBy,
    });

    const saved = await this.maintenanceRepository.save(maintenance);

    // Update equipment next maintenance date if this is scheduled
    if (maintenanceData.maintenanceType === MaintenanceType.PREVENTIVE) {
      equipment.nextMaintenanceDate = maintenanceData.scheduledDate;
      await this.equipmentRepository.save(equipment);
    }

    this.logger.log(`Created maintenance record ${saved.id} for equipment ${equipmentId}`);

    return saved;
  }

  /**
   * Complete maintenance
   */
  async completeMaintenance(
    maintenanceId: number,
    completionData: {
      maintenanceCost?: number;
      partsReplaced?: Array<{ partName: string; partNumber?: string; cost?: number }>;
      maintenanceNotes?: string;
      nextMaintenanceDate?: Date;
    },
    updatedBy?: number,
  ): Promise<EquipmentMaintenance> {
    const maintenance = await this.maintenanceRepository.findById(maintenanceId);

    if (!maintenance) {
      throw new NotFoundException(`Maintenance record with ID ${maintenanceId} not found`);
    }

    maintenance.maintenanceStatus = MaintenanceStatus.COMPLETED;
    maintenance.completedDate = new Date();
    maintenance.maintenanceCost = completionData.maintenanceCost || maintenance.maintenanceCost;
    maintenance.partsReplaced = completionData.partsReplaced || maintenance.partsReplaced;
    maintenance.maintenanceNotes = completionData.maintenanceNotes || maintenance.maintenanceNotes;
    maintenance.nextMaintenanceDate = completionData.nextMaintenanceDate;
    maintenance.updatedBy = updatedBy;

    const saved = await this.maintenanceRepository.save(maintenance);

    // Update equipment
    const equipment = await this.equipmentRepository.findById(maintenance.equipmentId);
    if (equipment) {
      equipment.lastMaintenanceDate = new Date();
      equipment.nextMaintenanceDate = completionData.nextMaintenanceDate || equipment.nextMaintenanceDate;
      if (equipment.equipmentStatus === EquipmentStatus.MAINTENANCE) {
        equipment.equipmentStatus = EquipmentStatus.AVAILABLE;
      }
      await this.equipmentRepository.save(equipment);
    }

    this.logger.log(`Completed maintenance ${maintenanceId}`);

    return saved;
  }

  /**
   * Get maintenance history for equipment
   */
  async getMaintenanceHistory(equipmentId: number): Promise<EquipmentMaintenance[]> {
    return this.maintenanceRepository.findByEquipment(equipmentId);
  }

  /**
   * Get scheduled maintenance
   */
  async getScheduledMaintenance(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<EquipmentMaintenance[]> {
    return this.maintenanceRepository.findScheduled(organizationId, beforeDate);
  }

  // ========== Booking Availability Methods ==========

  /**
   * Check if equipment is available for booking
   */
  async isEquipmentBookable(equipmentId: number): Promise<boolean> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    return equipment?.isBookable || false;
  }

  /**
   * Get bookable equipment
   */
  async getBookableEquipment(organizationId?: number): Promise<Equipment[]> {
    return this.equipmentRepository.findBookable(organizationId);
  }

  /**
   * Update equipment booking availability
   */
  async updateBookingAvailability(
    equipmentId: number,
    isBookable: boolean,
    bookingRules?: Record<string, any>,
    maxConcurrentBookings?: number | null,
    updatedBy?: number,
  ): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findById(equipmentId);

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    equipment.isBookable = isBookable;
    if (bookingRules !== undefined) {
      equipment.bookingAvailabilityRules = bookingRules;
    }
    if (maxConcurrentBookings !== undefined) {
      equipment.maxConcurrentBookings = maxConcurrentBookings;
    }
    equipment.updatedBy = updatedBy;

    return this.equipmentRepository.save(equipment);
  }
}
