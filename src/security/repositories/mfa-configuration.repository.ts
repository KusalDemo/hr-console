import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MfaConfiguration, MfaType } from '../entities/mfa-configuration.entity';

/**
 * MFA Configuration Repository
 */
@Injectable()
export class MfaConfigurationRepository extends Repository<MfaConfiguration> {
  constructor(private dataSource: DataSource) {
    super(MfaConfiguration, dataSource.createEntityManager());
  }

  /**
   * Find active MFA configuration for user
   */
  async findByUserAndType(
    userId: number,
    mfaType: MfaType,
  ): Promise<MfaConfiguration | null> {
    return this.findOne({
      where: { userId, mfaType, isActive: true },
    });
  }

  /**
   * Find all active MFA configurations for user
   */
  async findByUser(userId: number): Promise<MfaConfiguration[]> {
    return this.find({
      where: { userId, isActive: true },
    });
  }

  /**
   * Find enabled MFA configurations for user
   */
  async findEnabledByUser(userId: number): Promise<MfaConfiguration[]> {
    return this.find({
      where: { userId, isEnabled: true, isActive: true },
    });
  }
}
