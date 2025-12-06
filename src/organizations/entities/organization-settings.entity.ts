import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * Setting Type Enum
 * Defines the data type of the setting value
 */
export enum SettingType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
}

/**
 * Organization Settings Entity
 * 
 * Represents key-value configuration settings for organizations.
 * Each organization can have multiple settings, with unique keys per organization.
 * 
 * Settings support different types (STRING, NUMBER, BOOLEAN, JSON) and can be
 * organized by category for better management.
 */
@Entity('organization_settings')
@Unique('uq_org_settings_org_key', ['organizationId', 'settingKey'])
@Index('idx_org_settings_org', ['organizationId'])
@Index('idx_org_settings_key', ['organizationId', 'settingKey'])
@Index('idx_org_settings_category', ['organizationId', 'category'])
export class OrganizationSettings {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Organization this setting belongs to
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Setting key (unique within organization)
   * Examples: 'timezone', 'date_format', 'currency', 'leave_policy_enabled', etc.
   */
  @Column({ name: 'setting_key', type: 'varchar', length: 128, nullable: false })
  settingKey: string;

  /**
   * Setting value (stored as text, parsed based on settingType)
   * For JSON type, this should be a valid JSON string
   */
  @Column({ name: 'setting_value', type: 'text', nullable: true })
  settingValue: string | null;

  /**
   * Setting type - determines how the value should be parsed
   */
  @Column({
    name: 'setting_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: SettingType.STRING,
  })
  settingType: SettingType;

  /**
   * Category for grouping related settings
   * Examples: 'general', 'hr', 'payroll', 'leave', 'attendance', etc.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  /**
   * Description of what this setting does
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Get parsed value based on setting type
   * @returns Parsed value or null
   */
  getParsedValue(): any {
    if (!this.settingValue) {
      return null;
    }

    switch (this.settingType) {
      case SettingType.BOOLEAN:
        return this.settingValue.toLowerCase() === 'true';
      case SettingType.NUMBER:
        const num = parseFloat(this.settingValue);
        return isNaN(num) ? null : num;
      case SettingType.JSON:
        try {
          return JSON.parse(this.settingValue);
        } catch (e) {
          return null;
        }
      case SettingType.STRING:
      default:
        return this.settingValue;
    }
  }

  /**
   * Set value with automatic type detection
   * @param value - Value to set (will be converted to string)
   */
  setValue(value: any): void {
    if (value === null || value === undefined) {
      this.settingValue = null;
      return;
    }

    switch (this.settingType) {
      case SettingType.BOOLEAN:
        this.settingValue = value ? 'true' : 'false';
        break;
      case SettingType.NUMBER:
        this.settingValue = String(value);
        break;
      case SettingType.JSON:
        this.settingValue = JSON.stringify(value);
        break;
      case SettingType.STRING:
      default:
        this.settingValue = String(value);
        break;
    }
  }

  /**
   * Check if setting has a value
   */
  hasValue(): boolean {
    return this.settingValue !== null && this.settingValue !== undefined;
  }
}


