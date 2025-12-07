import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesController } from './resources.controller';
import { ResourceService, ResourceBookingService } from './services';
import {
  ResourceRepository,
  ResourceBookingRepository,
} from './repositories';
import { Resource, ResourceBooking } from './entities';

/**
 * Resources Module
 * 
 * Provides bookable resources (rooms, equipment, vehicles) with:
 * - Resource CRUD operations
 * - Resource categories, location mapping, maintenance schedules
 * - Booking management with conflict detection
 * - Approval workflows
 * - Booking policies (advance booking limits, cancellation rules)
 * - Integration with calendar events (via calendar_event_id field)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Resource, ResourceBooking]),
  ],
  controllers: [ResourcesController],
  providers: [
    ResourceService,
    ResourceBookingService,
    ResourceRepository,
    ResourceBookingRepository,
  ],
  exports: [
    ResourceService,
    ResourceBookingService,
    ResourceRepository,
    ResourceBookingRepository,
  ],
})
export class ResourcesModule {}
