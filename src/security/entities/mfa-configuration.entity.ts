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
import { User } from '../../users/entities/user.entity';

/**
 * MFA Type Enum
 */
export enum MfaType {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

/**
 * MFA Configuration Entity
 *
 * Multi-factor authentication configuration and secrets.
 * Supports TOTP, SMS, and email-based MFA.
 */
@Entity('mfa_configurations')
@Index('idx_mfa_user', ['userId'])
@Index('idx_mfa_active', ['isActive'])
@Index('idx_mfa_type', ['mfaType'])
export class MfaConfiguration {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User> | User;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId: number;

  @Column({
    name: 'mfa_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  mfaType: MfaType;

  @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: false })
  isEnabled: boolean;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  // TOTP configuration
  @Column({ name: 'totp_secret', type: 'varchar', length: 128, nullable: true })
  totpSecret: string | null;

  @Column({
    name: 'totp_issuer',
    type: 'varchar',
    length: 128,
    nullable: true,
    default: 'HR System',
  })
  totpIssuer: string | null;

  @Column({ name: 'backup_codes', type: 'jsonb', nullable: true })
  backupCodes: string[] | null;

  @Column({ name: 'backup_codes_used', type: 'jsonb', nullable: true })
  backupCodesUsed: string[] | null;

  // SMS configuration
  @Column({ name: 'phone_number', type: 'varchar', length: 32, nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'phone_verified', type: 'boolean', nullable: false, default: false })
  phoneVerified: boolean;

  // Email configuration (uses user email)
  @Column({ name: 'email_verified', type: 'boolean', nullable: false, default: false })
  emailVerified: boolean;

  // Verification
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  // Security
  @Column({ name: 'failed_attempts', type: 'integer', nullable: false, default: 0 })
  failedAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  // Metadata
  @Column({ name: 'device_fingerprint', type: 'varchar', length: 128, nullable: true })
  deviceFingerprint: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}

