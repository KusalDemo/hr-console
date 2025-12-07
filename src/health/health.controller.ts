import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MultiTenantService } from '../database/multi-tenant.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly multiTenantService: MultiTenantService,
  ) {}

  @Get()
  async check() {
    const dbHealth = await this.multiTenantService.getHealthStatus();
    const isHealthy = dbHealth.status === 'healthy';

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    };
  }

  @Get('readiness')
  async readiness() {
    const dbHealth = await this.multiTenantService.getHealthStatus();
    const isReady = dbHealth.status === 'healthy';

    if (!isReady) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      };
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('liveness')
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
