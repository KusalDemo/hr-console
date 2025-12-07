import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * User Repository
 * Provides custom queries for user operations with organization filtering
 */
@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  /**
   * Find user by email (case-insensitive)
   * Only returns active users
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
        active: true,
      },
      relations: ['roles', 'organizationMemberships'],
    });
  }

  /**
   * Find user by email including inactive accounts
   * Used for account management operations
   */
  async findByEmailIncludeInactive(email: string): Promise<User | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
      relations: ['roles', 'organizationMemberships'],
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.findOne({
      where: {
        id,
      },
      relations: ['roles', 'organizationMemberships'],
    });
  }

  /**
   * Find active user by ID
   */
  async findActiveById(id: number): Promise<User | null> {
    return this.findOne({
      where: {
        id,
        active: true,
      },
      relations: ['roles', 'organizationMemberships'],
    });
  }

  /**
   * Find users by organization ID
   * Returns all active users who belong to the organization
   */
  async findByOrganizationId(organizationId: number): Promise<User[]> {
    return this.createQueryBuilder('user')
      .innerJoin('user.organizationMemberships', 'membership')
      .where('membership.organizationId = :organizationId', { organizationId })
      .andWhere('membership.leftAt IS NULL')
      .andWhere('user.active = :active', { active: true })
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.organizationMemberships', 'orgMemberships')
      .getMany();
  }

  /**
   * Find users by organization ID with role filter
   */
  async findByOrganizationIdAndRole(organizationId: number, roleName: string): Promise<User[]> {
    return this.createQueryBuilder('user')
      .innerJoin('user.organizationMemberships', 'membership')
      .innerJoin('user.roles', 'role')
      .where('membership.organizationId = :organizationId', { organizationId })
      .andWhere('membership.leftAt IS NULL')
      .andWhere('user.active = :active', { active: true })
      .andWhere('role.name = :roleName', { roleName })
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.organizationMemberships', 'orgMemberships')
      .getMany();
  }

  /**
   * Find user by email and organization ID
   * Used for organization-scoped authentication
   */
  async findByEmailAndOrganization(email: string, organizationId: number): Promise<User | null> {
    return this.createQueryBuilder('user')
      .innerJoin('user.organizationMemberships', 'membership')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .andWhere('membership.organizationId = :organizationId', { organizationId })
      .andWhere('membership.leftAt IS NULL')
      .andWhere('user.active = :active', { active: true })
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.organizationMemberships', 'orgMemberships')
      .getOne();
  }

  /**
   * Find users with primary organization
   * Returns users who have a primary organization set
   */
  async findWithPrimaryOrganization(organizationId?: number): Promise<User[]> {
    const query = this.createQueryBuilder('user')
      .innerJoin('user.organizationMemberships', 'membership')
      .where('membership.isPrimary = :isPrimary', { isPrimary: true })
      .andWhere('membership.leftAt IS NULL')
      .andWhere('user.active = :active', { active: true })
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.organizationMemberships', 'orgMemberships');

    if (organizationId) {
      query.andWhere('membership.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find all active users
   */
  async findAllActive(): Promise<User[]> {
    return this.find({
      where: {
        active: true,
      },
      relations: ['roles', 'organizationMemberships'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Lock user account
   * Sets isLocked to true and optionally sets lockedUntil timestamp
   */
  async lockAccount(id: number, lockedUntil?: Date): Promise<void> {
    await this.update(id, {
      isLocked: true,
      lockedUntil: lockedUntil || null,
    });
  }

  /**
   * Unlock user account
   * Resets lock status and failed login attempts
   */
  async unlockAccount(id: number): Promise<void> {
    await this.update(id, {
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
  }

  /**
   * Increment failed login attempts
   * Also updates last_failed_login_at timestamp
   */
  async incrementFailedLoginAttempts(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      return;
    }

    const newAttempts = user.failedLoginAttempts + 1;
    await this.update(id, {
      failedLoginAttempts: newAttempts,
      lastFailedLoginAt: new Date(),
    });
  }

  /**
   * Reset failed login attempts
   * Called after successful login
   */
  async resetFailedLoginAttempts(id: number): Promise<void> {
    await this.update(id, {
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
    });
  }

  /**
   * Update password and related fields
   */
  async updatePassword(id: number, passwordHash: string, expiresAt?: Date): Promise<void> {
    await this.update(id, {
      passwordHash,
      passwordChangedAt: new Date(),
      passwordExpiresAt: expiresAt || null,
      requiresPasswordChange: false,
    });
  }

  /**
   * Mark password change as required
   */
  async requirePasswordChange(id: number): Promise<void> {
    await this.update(id, {
      requiresPasswordChange: true,
    });
  }

  /**
   * Activate user account
   */
  async activateAccount(id: number): Promise<void> {
    await this.update(id, {
      active: true,
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(id: number): Promise<void> {
    await this.update(id, {
      active: false,
    });
  }

  /**
   * Enable MFA for user
   */
  async enableMfa(id: number): Promise<void> {
    await this.update(id, {
      mfaEnabled: true,
    });
  }

  /**
   * Disable MFA for user
   */
  async disableMfa(id: number): Promise<void> {
    await this.update(id, {
      mfaEnabled: false,
    });
  }
}
