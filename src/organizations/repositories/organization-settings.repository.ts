import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrganizationSettings, SettingType } from '../entities/organization-settings.entity';

/**
 * Organization Settings Repository
 * Provides custom queries for organization settings operations
 */
@Injectable()
export class OrganizationSettingsRepository extends Repository<OrganizationSettings> {
  constructor(private dataSource: DataSource) {
    super(OrganizationSettings, dataSource.createEntityManager());
  }

  /**
   * Find setting by organization and key
   * Returns null if setting doesn't exist
   */
  async findByOrganizationAndKey(
    organizationId: number,
    settingKey: string,
  ): Promise<OrganizationSettings | null> {
    return this.findOne({
      where: {
        organizationId,
        settingKey: settingKey.trim(),
      },
      relations: ['organization'],
    });
  }

  /**
   * Find all settings for an organization
   */
  async findByOrganization(organizationId: number): Promise<OrganizationSettings[]> {
    return this.find({
      where: {
        organizationId,
      },
      relations: ['organization'],
      order: {
        category: 'ASC',
        settingKey: 'ASC',
      },
    });
  }

  /**
   * Find settings by organization and category
   */
  async findByOrganizationAndCategory(
    organizationId: number,
    category: string,
  ): Promise<OrganizationSettings[]> {
    return this.find({
      where: {
        organizationId,
        category: category.trim(),
      },
      relations: ['organization'],
      order: {
        settingKey: 'ASC',
      },
    });
  }

  /**
   * Check if setting exists for organization
   */
  async settingExists(organizationId: number, settingKey: string): Promise<boolean> {
    const count = await this.count({
      where: {
        organizationId,
        settingKey: settingKey.trim(),
      },
    });
    return count > 0;
  }

  /**
   * Get all setting keys for an organization
   */
  async getSettingKeys(organizationId: number): Promise<string[]> {
    const settings = await this.find({
      where: {
        organizationId,
      },
      select: ['settingKey'],
    });
    return settings.map((s) => s.settingKey);
  }

  /**
   * Get all categories for an organization
   */
  async getCategories(organizationId: number): Promise<string[]> {
    const settings = await this.find({
      where: {
        organizationId,
      },
      select: ['category'],
    });

    const categories = new Set<string>();
    settings.forEach((s) => {
      if (s.category) {
        categories.add(s.category);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Delete setting by organization and key
   */
  async deleteByOrganizationAndKey(organizationId: number, settingKey: string): Promise<void> {
    await this.delete({
      organizationId,
      settingKey: settingKey.trim(),
    });
  }

  /**
   * Delete all settings for an organization
   */
  async deleteByOrganization(organizationId: number): Promise<void> {
    await this.delete({
      organizationId,
    });
  }

  /**
   * Delete all settings in a category for an organization
   */
  async deleteByOrganizationAndCategory(organizationId: number, category: string): Promise<void> {
    await this.delete({
      organizationId,
      category: category.trim(),
    });
  }
}

