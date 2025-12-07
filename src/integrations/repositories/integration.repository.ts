import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Integration, IntegrationType, IntegrationStatus } from '../entities';

@Injectable()
export class IntegrationRepository extends Repository<Integration> {
  constructor(private dataSource: DataSource) {
    super(Integration, dataSource.createEntityManager());
  }

  /**
   * Find integration by key
   */
  async findByKey(integrationKey: string): Promise<Integration | null> {
    return this.findOne({
      where: { integrationKey },
    });
  }

  /**
   * Find integrations by type
   */
  async findByType(integrationType: IntegrationType): Promise<Integration[]> {
    return this.find({
      where: { integrationType, isActive: true },
      order: { integrationName: 'ASC' },
    });
  }

  /**
   * Find integrations by provider
   */
  async findByProvider(provider: string): Promise<Integration[]> {
    return this.find({
      where: { provider, isActive: true },
      order: { integrationName: 'ASC' },
    });
  }

  /**
   * Find active integrations
   */
  async findActive(): Promise<Integration[]> {
    return this.find({
      where: { isActive: true },
      order: { integrationName: 'ASC' },
    });
  }

  /**
   * Find integrations by status
   */
  async findByStatus(status: IntegrationStatus): Promise<Integration[]> {
    return this.find({
      where: { status, isActive: true },
      order: { integrationName: 'ASC' },
    });
  }

  /**
   * Find integrations needing token refresh
   */
  async findNeedingTokenRefresh(): Promise<Integration[]> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return this.createQueryBuilder('integration')
      .where('integration.integrationType = :type', { type: IntegrationType.OAUTH2 })
      .andWhere('integration.isActive = :active', { active: true })
      .andWhere('integration.oauth2TokenExpiresAt IS NOT NULL')
      .andWhere('integration.oauth2TokenExpiresAt <= :expiresAt', { expiresAt: fiveMinutesFromNow })
      .andWhere('integration.oauth2RefreshToken IS NOT NULL')
      .getMany();
  }

  /**
   * Find integrations with errors
   */
  async findWithErrors(threshold: number = 3): Promise<Integration[]> {
    return this.find({
      where: {
        isActive: true,
      },
      order: { errorCount: 'DESC' },
    }).then((integrations) =>
      integrations.filter((integration) => integration.errorCount >= threshold),
    );
  }
}
