import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Password Policy Entity
 * 
 * Configurable password rules for security compliance.
 * Supports organization-specific policies and tenant-wide defaults.
 */
@Entity('password_policies')
@Index('idx_password_policies_active', ['isActive'])
@Index('idx_password_policies_default', ['isDefault'])
@Index('idx_password_policies_org', ['organizationId'])
export class PasswordPolicy {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'policy_key', type: 'varchar', length: 128, unique: true, nullable: false })
  policyKey: string;

  @Column({ name: 'policy_name', type: 'varchar', length: 255, nullable: false })
  policyName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Password requirements
  @Column({ name: 'min_length', type: 'integer', nullable: false, default: 8 })
  minLength: number;

  @Column({ name: 'max_length', type: 'integer', nullable: true })
  maxLength: number | null;

  @Column({ name: 'require_uppercase', type: 'boolean', nullable: false, default: true })
  requireUppercase: boolean;

  @Column({ name: 'require_lowercase', type: 'boolean', nullable: false, default: true })
  requireLowercase: boolean;

  @Column({ name: 'require_digits', type: 'boolean', nullable: false, default: true })
  requireDigits: boolean;

  @Column({ name: 'require_special_chars', type: 'boolean', nullable: false, default: false })
  requireSpecialChars: boolean;

  @Column({
    name: 'special_chars_allowed',
    type: 'varchar',
    length: 64,
    nullable: true,
    default: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  })
  specialCharsAllowed: string | null;

  @Column({ name: 'disallow_common_passwords', type: 'boolean', nullable: false, default: true })
  disallowCommonPasswords: boolean;

  @Column({ name: 'common_passwords_list', type: 'jsonb', nullable: true })
  commonPasswordsList: string[] | null;

  @Column({ name: 'disallow_username', type: 'boolean', nullable: false, default: true })
  disallowUsername: boolean;

  @Column({ name: 'disallow_email', type: 'boolean', nullable: false, default: true })
  disallowEmail: boolean;

  @Column({ name: 'max_consecutive_chars', type: 'integer', nullable: false, default: 3 })
  maxConsecutiveChars: number;

  @Column({ name: 'max_repeating_chars', type: 'integer', nullable: false, default: 3 })
  maxRepeatingChars: number;

  // Password history
  @Column({ name: 'prevent_reuse_count', type: 'integer', nullable: true })
  preventReuseCount: number | null;

  @Column({ name: 'prevent_reuse_period_days', type: 'integer', nullable: true })
  preventReusePeriodDays: number | null;

  // Password expiration
  @Column({ name: 'expiration_days', type: 'integer', nullable: true })
  expirationDays: number | null;

  @Column({ name: 'warning_days_before_expiry', type: 'integer', nullable: false, default: 7 })
  warningDaysBeforeExpiry: number;

  // Password complexity
  @Column({ name: 'min_complexity_score', type: 'integer', nullable: false, default: 3 })
  minComplexityScore: number;

  @Column({ name: 'check_password_strength', type: 'boolean', nullable: false, default: true })
  checkPasswordStrength: boolean;

  // Account lockout
  @Column({ name: 'max_failed_attempts', type: 'integer', nullable: false, default: 5 })
  maxFailedAttempts: number;

  @Column({ name: 'lockout_duration_minutes', type: 'integer', nullable: false, default: 30 })
  lockoutDurationMinutes: number;

  @Column({ name: 'lockout_escalation_enabled', type: 'boolean', nullable: false, default: false })
  lockoutEscalationEnabled: boolean;

  @Column({
    name: 'lockout_escalation_multiplier',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: 2.0,
  })
  lockoutEscalationMultiplier: number;

  // Scope
  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'created_by' })
  createdBy: Promise<User> | User | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Promise<User> | User | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedById: number | null;
}
