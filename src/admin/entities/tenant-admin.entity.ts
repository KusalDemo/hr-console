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
import { Tenant } from './tenant.entity';

/**
 * Tenant Admin Entity - Represents tenant administrators in the admin schema
 * Tenant admins are linked to their specific tenant and can manage that tenant's data
 */
@Entity('tenant_admin', { schema: 'admin' })
@Index('idx_tenant_admin_tenant_id', ['tenant'])
@Index('idx_tenant_admin_email', ['email'])
@Index('idx_tenant_admin_active', ['isActive'])
export class TenantAdmin {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: false })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: false })
  fullName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt: Date | null;

  @Column({ name: 'password_expires_at', type: 'timestamptz', nullable: true })
  passwordExpiresAt: Date | null;

  @Column({ name: 'is_locked', type: 'boolean', default: false, nullable: false })
  isLocked: boolean;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'failed_login_attempts', type: 'integer', default: 0, nullable: false })
  failedLoginAttempts: number;

  @Column({ name: 'last_failed_login_at', type: 'timestamptz', nullable: true })
  lastFailedLoginAt: Date | null;

  @Column({ name: 'requires_password_change', type: 'boolean', default: false, nullable: false })
  requiresPasswordChange: boolean;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false, nullable: false })
  mfaEnabled: boolean;

  /**
   * Check if the account is currently locked
   */
  isAccountLocked(): boolean {
    if (!this.isLocked) {
      return false;
    }

    // If locked_until is set and has passed, account is no longer locked
    if (this.lockedUntil && this.lockedUntil < new Date()) {
      return false;
    }

    return this.isLocked;
  }

  /**
   * Check if password has expired
   */
  isPasswordExpired(): boolean {
    if (!this.passwordExpiresAt) {
      return false;
    }
    return this.passwordExpiresAt < new Date();
  }
}

