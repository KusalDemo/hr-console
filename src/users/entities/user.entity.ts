import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { OrganizationMembership } from '../../organizations/entities/organization-membership.entity';

/**
 * User Entity - Represents users in the tenant schema
 * Users belong to organizations and have roles
 */
@Entity('users')
@Index('idx_users_email', ['email'])
@Index('idx_users_active', ['active'])
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: false })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: false })
  fullName: string;

  @Column({ type: 'boolean', default: true, nullable: false })
  active: boolean;

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

  // Relationships
  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => OrganizationMembership, (membership) => membership.user, { eager: false })
  organizationMemberships: OrganizationMembership[];

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

  /**
   * Get primary organization ID
   */
  getPrimaryOrganizationId(): number | null {
    if (!this.organizationMemberships) {
      return null;
    }

    const primaryMembership = this.organizationMemberships.find((m) => m.isPrimary && !m.leftAt);
    return primaryMembership?.organizationId || null;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(roleName: string): boolean {
    if (!this.roles) {
      return false;
    }
    return this.roles.some((role) => role.name === roleName);
  }

  /**
   * Check if user belongs to an organization
   */
  belongsToOrganization(organizationId: number): boolean {
    if (!this.organizationMemberships) {
      return false;
    }
    return this.organizationMemberships.some(
      (m) => m.organizationId === organizationId && !m.leftAt,
    );
  }
}
