import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { ResourceService } from './services/resource.service';
import { ResourceBookingService } from './services/resource-booking.service';
import {
  CreateResourceDto,
  UpdateResourceDto,
  CreateResourceBookingDto,
  UpdateResourceBookingDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ResourceType, ResourceStatus } from './entities/resource.entity';
import { BookingStatus } from './entities/resource-booking.entity';

/**
 * Resources Controller
 * 
 * REST API endpoints for resource and booking management:
 * - Resources (CRUD, availability checking, search)
 * - Resource bookings (CRUD, approval, cancellation)
 * - Conflict detection
 * - Booking policies enforcement
 */
@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourcesController {
  constructor(
    private readonly resourceService: ResourceService,
    private readonly resourceBookingService: ResourceBookingService,
  ) {}

  // ========== Resource Endpoints ==========

  /**
   * Create a new resource
   * POST /resources
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createResource(
    @Body() createDto: CreateResourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceService.createResource(createDto, user.userId);
  }

  /**
   * Get resource by ID
   * GET /resources/:id
   */
  @Get(':id')
  async getResource(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeBookings', new ParseBoolPipe({ optional: true })) includeBookings = false,
  ) {
    return this.resourceService.getResourceById(id, includeBookings);
  }

  /**
   * Update resource
   * PUT /resources/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR')
  async updateResource(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateResourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceService.updateResource(id, updateDto, user.userId);
  }

  /**
   * Delete resource
   * DELETE /resources/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR')
  async deleteResource(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.resourceService.deleteResource(id, user.userId);
  }

  /**
   * Get resources by type
   * GET /resources/type/:type
   */
  @Get('type/:type')
  async getResourcesByType(
    @Param('type') type: ResourceType,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.resourceService.getResourcesByType(type, organizationId, includeInactive);
  }

  /**
   * Search resources
   * GET /resources/search
   */
  @Get('search')
  async searchResources(
    @Query('searchTerm') searchTerm?: string,
    @Query('resourceType') resourceType?: ResourceType,
    @Query('category') category?: string,
    @Query('locationId', new ParseIntPipe({ optional: true })) locationId?: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('minCapacity', new ParseIntPipe({ optional: true })) minCapacity?: number,
    @Query('hasFeatures') hasFeatures?: string, // Comma-separated list
  ) {
    return this.resourceService.searchResources({
      searchTerm,
      resourceType,
      category,
      locationId,
      organizationId,
      minCapacity,
      hasFeatures: hasFeatures ? hasFeatures.split(',') : undefined,
    });
  }

  /**
   * Check resource availability
   * GET /resources/:id/availability
   */
  @Get(':id/availability')
  async checkAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.resourceService.checkAvailability(id, new Date(startTime), new Date(endTime));
  }

  /**
   * Get available resources
   * GET /resources/available
   */
  @Get('available')
  async getAvailableResources(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('resourceType') resourceType?: ResourceType,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('minCapacity', new ParseIntPipe({ optional: true })) minCapacity?: number,
  ) {
    return this.resourceService.getAvailableResources(new Date(startTime), new Date(endTime), {
      resourceType,
      organizationId,
      minCapacity,
    });
  }

  /**
   * Update resource status
   * PUT /resources/:id/status
   */
  @Put(':id/status')
  @Roles('ADMIN', 'HR')
  async updateResourceStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ResourceStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceService.updateResourceStatus(id, status, user.userId);
  }

  // ========== Booking Endpoints ==========

  /**
   * Create a new booking
   * POST /resources/bookings
   */
  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async createBooking(
    @Body() createDto: CreateResourceBookingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceBookingService.createBooking(
      {
        ...createDto,
        startTime: new Date(createDto.startTime),
        endTime: new Date(createDto.endTime),
        bookedById: createDto.bookedById || user.userId,
      },
      user.userId,
    );
  }

  /**
   * Get booking by ID
   * GET /resources/bookings/:id
   */
  @Get('bookings/:id')
  async getBooking(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeResource', new ParseBoolPipe({ optional: true })) includeResource = false,
  ) {
    return this.resourceBookingService.getBookingById(id, includeResource);
  }

  /**
   * Update booking
   * PUT /resources/bookings/:id
   */
  @Put('bookings/:id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updateBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateResourceBookingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceBookingService.updateBooking(
      id,
      {
        ...updateDto,
        startTime: updateDto.startTime ? new Date(updateDto.startTime) : undefined,
        endTime: updateDto.endTime ? new Date(updateDto.endTime) : undefined,
      },
      user.userId,
    );
  }

  /**
   * Cancel booking
   * DELETE /resources/bookings/:id
   */
  @Delete('bookings/:id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body('cancellationReason') cancellationReason?: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceBookingService.cancelBooking(id, cancellationReason, user.userId);
  }

  /**
   * Approve booking
   * POST /resources/bookings/:id/approve
   */
  @Post('bookings/:id/approve')
  @Roles('ADMIN', 'HR')
  async approveBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body('approvalReason') approvalReason?: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceBookingService.approveBooking(id, user.userId, approvalReason);
  }

  /**
   * Reject booking
   * POST /resources/bookings/:id/reject
   */
  @Post('bookings/:id/reject')
  @Roles('ADMIN', 'HR')
  async rejectBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body('rejectionReason') rejectionReason: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourceBookingService.rejectBooking(id, user.userId, rejectionReason);
  }

  /**
   * Get bookings for resource
   * GET /resources/:resourceId/bookings
   */
  @Get(':resourceId/bookings')
  async getBookingsForResource(
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeCancelled', new ParseBoolPipe({ optional: true })) includeCancelled = false,
  ) {
    return this.resourceBookingService.getBookingsForResource(
      resourceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      includeCancelled,
    );
  }

  /**
   * Get bookings for user
   * GET /resources/bookings/user/:userId
   */
  @Get('bookings/user/:userId')
  async getBookingsForUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.resourceBookingService.getBookingsForUser(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      organizationId,
    );
  }

  /**
   * Get booking statistics
   * GET /resources/:resourceId/statistics
   */
  @Get(':resourceId/statistics')
  @Roles('ADMIN', 'HR')
  async getBookingStatistics(
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.resourceBookingService.getBookingStatistics(
      resourceId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
