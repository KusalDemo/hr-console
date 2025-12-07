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
import { EquipmentService } from './services/equipment.service';
import {
  CreateEquipmentDto,
  CreateEquipmentAssignmentDto,
  CreateEquipmentMaintenanceDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EquipmentStatus } from './entities/equipment.entity';

/**
 * Equipment Controller
 * 
 * REST API endpoints for equipment and asset tracking:
 * - Equipment (CRUD, search, status management)
 * - Equipment assignments (assign, return, tracking)
 * - Equipment maintenance (scheduling, completion, history)
 * - Warranty tracking
 * - Depreciation tracking
 */
@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // ========== Equipment Endpoints ==========

  /**
   * Create a new equipment
   * POST /equipment
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createEquipment(
    @Body() createDto: CreateEquipmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.createEquipment(
      {
        ...createDto,
        purchaseDate: createDto.purchaseDate ? new Date(createDto.purchaseDate) : undefined,
        warrantyStartDate: createDto.warrantyStartDate
          ? new Date(createDto.warrantyStartDate)
          : undefined,
        warrantyEndDate: createDto.warrantyEndDate ? new Date(createDto.warrantyEndDate) : undefined,
        nextMaintenanceDate: createDto.nextMaintenanceDate
          ? new Date(createDto.nextMaintenanceDate)
          : undefined,
      },
      user.userId,
    );
  }

  /**
   * Get equipment by ID
   * GET /equipment/:id
   */
  @Get(':id')
  async getEquipment(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeAssignments', new ParseBoolPipe({ optional: true })) includeAssignments = false,
    @Query('includeMaintenance', new ParseBoolPipe({ optional: true })) includeMaintenance = false,
  ) {
    return this.equipmentService.getEquipmentById(id, includeAssignments, includeMaintenance);
  }

  /**
   * Get equipment by asset tag
   * GET /equipment/asset-tag/:assetTag
   */
  @Get('asset-tag/:assetTag')
  async getEquipmentByAssetTag(@Param('assetTag') assetTag: string) {
    return this.equipmentService.getEquipmentByAssetTag(assetTag);
  }

  /**
   * Update equipment
   * PUT /equipment/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR')
  async updateEquipment(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.updateEquipment(id, updateDto, user.userId);
  }

  /**
   * Update equipment status
   * PUT /equipment/:id/status
   */
  @Put(':id/status')
  @Roles('ADMIN', 'HR')
  async updateEquipmentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: EquipmentStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.updateEquipmentStatus(id, status, user.userId);
  }

  /**
   * Get equipment needing maintenance
   * GET /equipment/needing-maintenance
   */
  @Get('needing-maintenance')
  @Roles('ADMIN', 'HR')
  async getEquipmentNeedingMaintenance(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('beforeDate') beforeDate?: string,
  ) {
    return this.equipmentService.getEquipmentNeedingMaintenance(
      organizationId,
      beforeDate ? new Date(beforeDate) : undefined,
    );
  }

  /**
   * Get equipment with expired warranty
   * GET /equipment/expired-warranty
   */
  @Get('expired-warranty')
  @Roles('ADMIN', 'HR')
  async getEquipmentWithExpiredWarranty(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.equipmentService.getEquipmentWithExpiredWarranty(organizationId);
  }

  /**
   * Search equipment
   * GET /equipment/search
   */
  @Get('search')
  async searchEquipment(
    @Query('searchTerm') searchTerm?: string,
    @Query('category') category?: string,
    @Query('equipmentType') equipmentType?: string,
    @Query('status') status?: EquipmentStatus,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.equipmentService.searchEquipment({
      searchTerm,
      category,
      equipmentType,
      status,
      organizationId,
    });
  }

  // ========== Assignment Endpoints ==========

  /**
   * Assign equipment to employee
   * POST /equipment/:equipmentId/assign
   */
  @Post(':equipmentId/assign')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async assignEquipment(
    @Param('equipmentId', ParseIntPipe) equipmentId: number,
    @Body() assignmentDto: CreateEquipmentAssignmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.assignEquipment(
      equipmentId,
      assignmentDto.employeeId,
      user.userId,
      {
        expectedReturnDate: assignmentDto.expectedReturnDate
          ? new Date(assignmentDto.expectedReturnDate)
          : undefined,
        assignmentNotes: assignmentDto.assignmentNotes,
        conditionAtAssignment: assignmentDto.conditionAtAssignment,
      },
      user.userId,
    );
  }

  /**
   * Return equipment
   * POST /equipment/assignments/:assignmentId/return
   */
  @Post('assignments/:assignmentId/return')
  @Roles('ADMIN', 'HR')
  async returnEquipment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body('conditionAtReturn') conditionAtReturn?: string,
    @Body('returnNotes') returnNotes?: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.returnEquipment(
      assignmentId,
      user.userId,
      {
        conditionAtReturn,
        returnNotes,
      },
      user.userId,
    );
  }

  /**
   * Get assignments by employee
   * GET /equipment/assignments/employee/:employeeId
   */
  @Get('assignments/employee/:employeeId')
  async getAssignmentsByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('includeReturned', new ParseBoolPipe({ optional: true })) includeReturned = false,
  ) {
    return this.equipmentService.getAssignmentsByEmployee(employeeId, includeReturned);
  }

  /**
   * Get assignments by equipment
   * GET /equipment/:equipmentId/assignments
   */
  @Get(':equipmentId/assignments')
  async getAssignmentsByEquipment(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.equipmentService.getAssignmentsByEquipment(equipmentId);
  }

  // ========== Maintenance Endpoints ==========

  /**
   * Create maintenance record
   * POST /equipment/maintenance
   */
  @Post('maintenance')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createMaintenance(
    @Body() maintenanceDto: CreateEquipmentMaintenanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.createMaintenance(
      maintenanceDto.equipmentId,
      {
        ...maintenanceDto,
        scheduledDate: new Date(maintenanceDto.scheduledDate),
      },
      user.userId,
    );
  }

  /**
   * Complete maintenance
   * POST /equipment/maintenance/:maintenanceId/complete
   */
  @Post('maintenance/:maintenanceId/complete')
  @Roles('ADMIN', 'HR')
  async completeMaintenance(
    @Param('maintenanceId', ParseIntPipe) maintenanceId: number,
    @Body() completionData: {
      maintenanceCost?: number;
      partsReplaced?: Array<{ partName: string; partNumber?: string; cost?: number }>;
      maintenanceNotes?: string;
      nextMaintenanceDate?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.completeMaintenance(
      maintenanceId,
      {
        ...completionData,
        nextMaintenanceDate: completionData.nextMaintenanceDate
          ? new Date(completionData.nextMaintenanceDate)
          : undefined,
      },
      user.userId,
    );
  }

  /**
   * Get maintenance history for equipment
   * GET /equipment/:equipmentId/maintenance
   */
  @Get(':equipmentId/maintenance')
  async getMaintenanceHistory(@Param('equipmentId', ParseIntPipe) equipmentId: number) {
    return this.equipmentService.getMaintenanceHistory(equipmentId);
  }

  /**
   * Get scheduled maintenance
   * GET /equipment/maintenance/scheduled
   */
  @Get('maintenance/scheduled')
  @Roles('ADMIN', 'HR')
  async getScheduledMaintenance(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('beforeDate') beforeDate?: string,
  ) {
    return this.equipmentService.getScheduledMaintenance(
      organizationId,
      beforeDate ? new Date(beforeDate) : undefined,
    );
  }
}
