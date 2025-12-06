import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';
import { MultiTenantService } from '../database/multi-tenant.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [MultiTenantService],
  exports: [MultiTenantService],
})
export class HealthModule {}

