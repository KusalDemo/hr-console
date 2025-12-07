import { Injectable } from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { NotificationPreference } from '../entities';

@Injectable()
export class NotificationPreferenceRepository extends Repository<NotificationPreference> {
  constructor(private dataSource: DataSource) {
    super(NotificationPreference, dataSource.createEntityManager());
  }

  /**
   * Find user preferences
   */
  async findByUser(userId: number): Promise<NotificationPreference[]> {
    return this.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find organization preferences
   */
  async findByOrganization(organizationId: number): Promise<NotificationPreference[]> {
    return this.find({
      where: { organizationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find preference for user and template
   */
  async findByUserAndTemplate(
    userId: number,
    templateKey: string,
  ): Promise<NotificationPreference | null> {
    return this.findOne({
      where: { userId, templateKey, isActive: true },
    });
  }

  /**
   * Find preference for user and category
   */
  async findByUserAndCategory(
    userId: number,
    category: string,
  ): Promise<NotificationPreference | null> {
    return this.findOne({
      where: { userId, category, isActive: true },
    });
  }

  /**
   * Find global preference for user
   */
  async findGlobalByUser(userId: number): Promise<NotificationPreference | null> {
    return this.findOne({
      where: { userId, templateKey: IsNull(), category: IsNull(), isActive: true },
    });
  }

  /**
   * Find preference for organization and template
   */
  async findByOrganizationAndTemplate(
    organizationId: number,
    templateKey: string,
  ): Promise<NotificationPreference | null> {
    return this.findOne({
      where: { organizationId, templateKey, isActive: true },
    });
  }

  /**
   * Find preference for organization and category
   */
  async findByOrganizationAndCategory(
    organizationId: number,
    category: string,
  ): Promise<NotificationPreference | null> {
    return this.findOne({
      where: { organizationId, category, isActive: true },
    });
  }

  /**
   * Find global preference for organization
   */
  async findGlobalByOrganization(organizationId: number): Promise<NotificationPreference | null> {
    return this.findOne({
      where: { organizationId, templateKey: IsNull(), category: IsNull(), isActive: true },
    });
  }
}
