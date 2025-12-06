import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationSettingsRepository } from '../repositories/organization-settings.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationSettings, SettingType } from '../entities/organization-settings.entity';

/**
 * Organization Settings Service
 * 
 * Provides business logic for organization settings management:
 * - Get setting values (with type conversion and defaults)
 * - Set/update settings
 * - Delete settings
 * - Get all settings (as map or grouped by category)
 * - Settings validation
 * - Default settings management
 * 
 * This service handles all organization settings operations
 * within the current tenant context.
 */
@Injectable()
export class OrganizationSettingsService {
  private readonly logger = new Logger(OrganizationSettingsService.name);

  constructor(
    private readonly settingsRepository: OrganizationSettingsRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Get a setting value for an organization
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @param defaultValue - Default value if setting doesn't exist (optional)
   * @returns Setting value or default value
   */
  async getSetting(
    organizationId: number,
    key: string,
    defaultValue?: string,
  ): Promise<string | null> {
    const setting = await this.settingsRepository.findByOrganizationAndKey(
      organizationId,
      key,
    );

    if (!setting) {
      return defaultValue !== undefined ? defaultValue : null;
    }

    return setting.settingValue !== null ? setting.settingValue : (defaultValue ?? null);
  }

  /**
   * Get a boolean setting for an organization
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @param defaultValue - Default value if setting doesn't exist (default: false)
   * @returns Boolean value
   */
  async getBooleanSetting(
    organizationId: number,
    key: string,
    defaultValue: boolean = false,
  ): Promise<boolean> {
    const value = await this.getSetting(organizationId, key, String(defaultValue));
    if (value === null) {
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  }

  /**
   * Get a number setting for an organization
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @param defaultValue - Default value if setting doesn't exist (optional)
   * @returns Number value or default
   */
  async getNumberSetting(
    organizationId: number,
    key: string,
    defaultValue?: number,
  ): Promise<number | null> {
    const value = await this.getSetting(organizationId, key);
    if (value === null) {
      return defaultValue !== undefined ? defaultValue : null;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      this.logger.warn(
        `Invalid number value for setting ${key} in organization ${organizationId}: ${value}`,
      );
      return defaultValue !== undefined ? defaultValue : null;
    }

    return num;
  }

  /**
   * Get a JSON setting for an organization
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @param defaultValue - Default value if setting doesn't exist (optional)
   * @returns Parsed JSON object or default
   */
  async getJsonSetting<T = any>(
    organizationId: number,
    key: string,
    defaultValue?: T,
  ): Promise<T | null> {
    const value = await this.getSetting(organizationId, key);
    if (value === null) {
      return defaultValue !== undefined ? defaultValue : null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(
        `Invalid JSON value for setting ${key} in organization ${organizationId}: ${error}`,
      );
      return defaultValue !== undefined ? defaultValue : null;
    }
  }

  /**
   * Get all settings for an organization as a map
   * 
   * @param organizationId - Organization ID
   * @returns Map of setting keys to values
   */
  async getAllSettings(organizationId: number): Promise<Map<string, string>> {
    const settings = await this.settingsRepository.findByOrganization(organizationId);
    const map = new Map<string, string>();

    settings.forEach((setting) => {
      map.set(setting.settingKey, setting.settingValue || '');
    });

    return map;
  }

  /**
   * Get all settings for an organization as a plain object
   * 
   * @param organizationId - Organization ID
   * @returns Object with setting keys as properties
   */
  async getAllSettingsAsObject(organizationId: number): Promise<Record<string, string>> {
    const settings = await this.settingsRepository.findByOrganization(organizationId);
    const obj: Record<string, string> = {};

    settings.forEach((setting) => {
      obj[setting.settingKey] = setting.settingValue || '';
    });

    return obj;
  }

  /**
   * Get settings grouped by category
   * 
   * @param organizationId - Organization ID
   * @returns Map of categories to settings arrays
   */
  async getSettingsByCategory(
    organizationId: number,
  ): Promise<Map<string, OrganizationSettings[]>> {
    const settings = await this.settingsRepository.findByOrganization(organizationId);
    const grouped = new Map<string, OrganizationSettings[]>();

    settings.forEach((setting) => {
      const category = setting.category || 'uncategorized';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(setting);
    });

    return grouped;
  }

  /**
   * Set or update a setting for an organization
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @param value - Setting value
   * @param type - Setting type (default: STRING)
   * @param category - Category (optional)
   * @param description - Description (optional)
   * @returns Created or updated setting
   * @throws NotFoundException if organization doesn't exist
   */
  async setSetting(
    organizationId: number,
    key: string,
    value: any,
    type: SettingType = SettingType.STRING,
    category?: string | null,
    description?: string | null,
  ): Promise<OrganizationSettings> {
    // Validate organization exists
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Validate key
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      throw new BadRequestException('Setting key cannot be empty');
    }

    if (trimmedKey.length > 128) {
      throw new BadRequestException('Setting key cannot exceed 128 characters');
    }

    // Find existing setting
    let setting = await this.settingsRepository.findByOrganizationAndKey(
      organizationId,
      trimmedKey,
    );

    if (setting) {
      // Update existing setting
      setting.setValue(value);
      if (type !== undefined) {
        setting.settingType = type;
      }
      if (category !== undefined) {
        setting.category = category?.trim() || null;
      }
      if (description !== undefined) {
        setting.description = description?.trim() || null;
      }
    } else {
      // Create new setting
      setting = this.settingsRepository.create({
        organizationId,
        settingKey: trimmedKey,
        settingType: type,
        category: category?.trim() || null,
        description: description?.trim() || null,
      });
      setting.setValue(value);
    }

    const savedSetting = await this.settingsRepository.save(setting);

    this.logger.log(
      `Setting updated: organization=${organizationId}, key=${trimmedKey}, type=${type}`,
    );

    return savedSetting;
  }

  /**
   * Delete a setting for an organization
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @throws NotFoundException if setting doesn't exist
   */
  async deleteSetting(organizationId: number, key: string): Promise<void> {
    const setting = await this.settingsRepository.findByOrganizationAndKey(
      organizationId,
      key,
    );

    if (!setting) {
      throw new NotFoundException(
        `Setting '${key}' not found for organization ${organizationId}`,
      );
    }

    await this.settingsRepository.remove(setting);

    this.logger.log(`Setting deleted: organization=${organizationId}, key=${key}`);
  }

  /**
   * Delete all settings for an organization
   * 
   * @param organizationId - Organization ID
   */
  async deleteAllSettings(organizationId: number): Promise<void> {
    await this.settingsRepository.deleteByOrganization(organizationId);
    this.logger.log(`All settings deleted for organization ${organizationId}`);
  }

  /**
   * Delete all settings in a category for an organization
   * 
   * @param organizationId - Organization ID
   * @param category - Category name
   */
  async deleteSettingsByCategory(organizationId: number, category: string): Promise<void> {
    await this.settingsRepository.deleteByOrganizationAndCategory(organizationId, category);
    this.logger.log(
      `Settings deleted: organization=${organizationId}, category=${category}`,
    );
  }

  /**
   * Get setting entity (for advanced operations)
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @returns Setting entity or null
   */
  async getSettingEntity(
    organizationId: number,
    key: string,
  ): Promise<OrganizationSettings | null> {
    return this.settingsRepository.findByOrganizationAndKey(organizationId, key);
  }

  /**
   * Get settings by category
   * 
   * @param organizationId - Organization ID
   * @param category - Category name
   * @returns Array of settings
   */
  async getSettingsByCategoryName(
    organizationId: number,
    category: string,
  ): Promise<OrganizationSettings[]> {
    return this.settingsRepository.findByOrganizationAndCategory(organizationId, category);
  }

  /**
   * Get all categories for an organization
   * 
   * @param organizationId - Organization ID
   * @returns Array of category names
   */
  async getCategories(organizationId: number): Promise<string[]> {
    return this.settingsRepository.getCategories(organizationId);
  }

  /**
   * Check if setting exists
   * 
   * @param organizationId - Organization ID
   * @param key - Setting key
   * @returns True if setting exists
   */
  async settingExists(organizationId: number, key: string): Promise<boolean> {
    return this.settingsRepository.settingExists(organizationId, key);
  }

  /**
   * Initialize default settings for an organization
   * 
   * @param organizationId - Organization ID
   * @param defaultSettings - Map of default settings (key -> { value, type, category?, description? })
   */
  async initializeDefaultSettings(
    organizationId: number,
    defaultSettings: Map<
      string,
      {
        value: any;
        type: SettingType;
        category?: string;
        description?: string;
      }
    >,
  ): Promise<void> {
    for (const [key, config] of defaultSettings.entries()) {
      const existing = await this.settingsRepository.settingExists(organizationId, key);
      if (!existing) {
        await this.setSetting(
          organizationId,
          key,
          config.value,
          config.type,
          config.category,
          config.description,
        );
      }
    }

    this.logger.log(
      `Initialized default settings for organization ${organizationId}`,
    );
  }
}


