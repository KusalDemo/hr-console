import { Injectable } from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { OrganizationMembership } from '../entities/organization-membership.entity';

/**
 * Organization Membership Repository
 * Provides custom queries for organization membership operations
 */
@Injectable()
export class OrganizationMembershipRepository extends Repository<OrganizationMembership> {
  constructor(private dataSource: DataSource) {
    super(OrganizationMembership, dataSource.createEntityManager());
  }

  /**
   * Find active membership by user and organization
   * Returns null if membership doesn't exist or is inactive
   */
  async findByUserAndOrganization(
    userId: number,
    organizationId: number,
  ): Promise<OrganizationMembership | null> {
    return this.findOne({
      where: {
        userId,
        organizationId,
        leftAt: IsNull(),
      },
      relations: ['user', 'organization'],
    });
  }

  /**
   * Find all active memberships for a user
   */
  async findByUser(userId: number): Promise<OrganizationMembership[]> {
    return this.find({
      where: {
        userId,
        leftAt: IsNull(),
      },
      relations: ['organization'],
      order: {
        isPrimary: 'DESC',
        joinedAt: 'ASC',
      },
    });
  }

  /**
   * Find all active memberships for an organization
   */
  async findByOrganization(organizationId: number): Promise<OrganizationMembership[]> {
    return this.find({
      where: {
        organizationId,
        leftAt: IsNull(),
      },
      relations: ['user'],
      order: {
        joinedAt: 'ASC',
      },
    });
  }

  /**
   * Find primary organization membership for a user
   * Returns null if no primary organization is set
   */
  async findPrimaryByUser(userId: number): Promise<OrganizationMembership | null> {
    return this.findOne({
      where: {
        userId,
        isPrimary: true,
        leftAt: IsNull(),
      },
      relations: ['organization'],
    });
  }

  /**
   * Check if user is a member of organization
   */
  async isUserMember(userId: number, organizationId: number): Promise<boolean> {
    const membership = await this.findByUserAndOrganization(userId, organizationId);
    return membership !== null;
  }

  /**
   * Get membership count for an organization
   */
  async getMemberCount(organizationId: number): Promise<number> {
    return this.count({
      where: {
        organizationId,
        leftAt: IsNull(),
      },
    });
  }

  /**
   * Get organization count for a user
   */
  async getOrganizationCount(userId: number): Promise<number> {
    return this.count({
      where: {
        userId,
        leftAt: IsNull(),
      },
    });
  }

  /**
   * Unset all primary organization flags for a user
   * Used when setting a new primary organization
   */
  async unsetPrimaryForUser(userId: number): Promise<void> {
    await this.update(
      {
        userId,
        isPrimary: true,
        leftAt: IsNull(),
      },
      {
        isPrimary: false,
      },
    );
  }

  /**
   * Find all memberships (including inactive)
   * Used for audit and reporting purposes
   */
  async findAllForUser(userId: number, includeInactive = false): Promise<OrganizationMembership[]> {
    const where: any = { userId };

    if (!includeInactive) {
      where.leftAt = null;
    }

    return this.find({
      where,
      relations: ['organization'],
      order: {
        joinedAt: 'DESC',
      },
    });
  }

  /**
   * Find all memberships for organization (including inactive)
   */
  async findAllForOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<OrganizationMembership[]> {
    const where: any = { organizationId };

    if (!includeInactive) {
      where.leftAt = null;
    }

    return this.find({
      where,
      relations: ['user'],
      order: {
        joinedAt: 'DESC',
      },
    });
  }
}
