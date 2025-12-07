import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { OrganizationMembershipRepository } from '../repositories/organization-membership.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { OrganizationMembership } from '../entities/organization-membership.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Organization Membership Service
 *
 * Provides business logic for organization membership operations:
 * - Add user to organization
 * - Remove user from organization
 * - Set primary organization
 * - Update organization role
 *
 * This service handles all membership management operations
 * within the current tenant context.
 */
@Injectable()
export class OrganizationMembershipService {
  private readonly logger = new Logger(OrganizationMembershipService.name);

  constructor(
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Add user to organization
   *
   * Creates a new membership or reactivates an existing inactive membership.
   * If setting as primary, automatically unsets other primary memberships.
   *
   * @param userId - User ID to add
   * @param organizationId - Organization ID
   * @param role - User's role in the organization (optional)
   * @param isPrimary - Whether this should be the user's primary organization (default: false)
   * @returns Created or reactivated membership
   * @throws NotFoundException if user or organization not found
   * @throws ConflictException if user is already an active member
   */
  async addUserToOrganization(
    userId: number,
    organizationId: number,
    role?: string | null,
    isPrimary: boolean = false,
  ): Promise<OrganizationMembership> {
    this.logger.log(
      `Adding user ${userId} to organization ${organizationId} (role: ${role || 'none'}, primary: ${isPrimary})`,
    );

    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate organization exists
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Check if active membership already exists
    const existingMembership = await this.membershipRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );

    if (existingMembership) {
      throw new ConflictException(
        `User ${userId} is already an active member of organization ${organizationId}`,
      );
    }

    // Check for inactive membership (user previously left)
    const allMemberships = await this.membershipRepository.findAllForUser(userId, true);
    const inactiveMembership = allMemberships.find(
      (m) => m.organizationId === organizationId && m.leftAt !== null,
    );

    let membership: OrganizationMembership;

    if (inactiveMembership) {
      // Reactivate existing membership
      this.logger.log(
        `Reactivating existing membership for user ${userId} in organization ${organizationId}`,
      );
      inactiveMembership.reactivate();
      inactiveMembership.role = role || null;
      inactiveMembership.isPrimary = isPrimary;
      membership = await this.membershipRepository.save(inactiveMembership);
    } else {
      // Create new membership
      membership = this.membershipRepository.create({
        userId,
        organizationId,
        role: role || null,
        isPrimary,
      });
      membership = await this.membershipRepository.save(membership);
    }

    // If setting as primary, unset other primary memberships
    if (isPrimary) {
      await this.unsetOtherPrimaryMemberships(userId, membership.id);
    }

    this.logger.log(
      `Successfully added user ${userId} to organization ${organizationId} (membership ID: ${membership.id})`,
    );

    return membership;
  }

  /**
   * Remove user from organization
   *
   * Soft deletes the membership by setting left_at timestamp.
   * If this was the primary organization, it will be unset.
   *
   * @param userId - User ID to remove
   * @param organizationId - Organization ID
   * @returns Updated membership (with left_at set)
   * @throws NotFoundException if user, organization, or membership not found
   */
  async removeUserFromOrganization(
    userId: number,
    organizationId: number,
  ): Promise<OrganizationMembership> {
    this.logger.log(`Removing user ${userId} from organization ${organizationId}`);

    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate organization exists
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Find active membership
    const membership = await this.membershipRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );

    if (!membership) {
      throw new NotFoundException(
        `User ${userId} is not an active member of organization ${organizationId}`,
      );
    }

    // Soft delete by setting left_at
    membership.markAsInactive();

    // If this was the primary organization, unset the flag
    if (membership.isPrimary) {
      membership.unsetAsPrimary();
    }

    const updatedMembership = await this.membershipRepository.save(membership);

    this.logger.log(
      `Successfully removed user ${userId} from organization ${organizationId} (membership ID: ${updatedMembership.id})`,
    );

    return updatedMembership;
  }

  /**
   * Set primary organization for user
   *
   * Sets the specified organization as the user's primary organization.
   * Automatically unsets any other primary organization.
   * The user must be a member of the organization.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID to set as primary
   * @returns Updated membership
   * @throws NotFoundException if user, organization, or membership not found
   */
  async setPrimaryOrganization(
    userId: number,
    organizationId: number,
  ): Promise<OrganizationMembership> {
    this.logger.log(`Setting organization ${organizationId} as primary for user ${userId}`);

    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate organization exists
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Find active membership
    const membership = await this.membershipRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );

    if (!membership) {
      throw new NotFoundException(
        `User ${userId} is not an active member of organization ${organizationId}`,
      );
    }

    // If already primary, return as-is
    if (membership.isPrimary) {
      this.logger.log(`Organization ${organizationId} is already primary for user ${userId}`);
      return membership;
    }

    // Unset other primary memberships
    await this.unsetOtherPrimaryMemberships(userId, membership.id);

    // Set as primary
    membership.setAsPrimary();
    const updatedMembership = await this.membershipRepository.save(membership);

    this.logger.log(
      `Successfully set organization ${organizationId} as primary for user ${userId}`,
    );

    return updatedMembership;
  }

  /**
   * Update organization role for user
   *
   * Updates the user's role within a specific organization.
   * The user must be an active member of the organization.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param role - New role (can be null to remove role)
   * @returns Updated membership
   * @throws NotFoundException if user, organization, or membership not found
   */
  async updateOrganizationRole(
    userId: number,
    organizationId: number,
    role: string | null,
  ): Promise<OrganizationMembership> {
    this.logger.log(
      `Updating role for user ${userId} in organization ${organizationId} to: ${role || 'none'}`,
    );

    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate organization exists
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Find active membership
    const membership = await this.membershipRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );

    if (!membership) {
      throw new NotFoundException(
        `User ${userId} is not an active member of organization ${organizationId}`,
      );
    }

    // Update role
    membership.role = role || null;
    const updatedMembership = await this.membershipRepository.save(membership);

    this.logger.log(
      `Successfully updated role for user ${userId} in organization ${organizationId}`,
    );

    return updatedMembership;
  }

  /**
   * Get user's organization memberships
   *
   * @param userId - User ID
   * @param includeInactive - Include inactive memberships (default: false)
   * @returns List of memberships
   */
  async getUserMemberships(
    userId: number,
    includeInactive: boolean = false,
  ): Promise<OrganizationMembership[]> {
    return this.membershipRepository.findAllForUser(userId, includeInactive);
  }

  /**
   * Get organization's members
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive memberships (default: false)
   * @returns List of memberships
   */
  async getOrganizationMembers(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<OrganizationMembership[]> {
    return this.membershipRepository.findAllForOrganization(organizationId, includeInactive);
  }

  /**
   * Get user's primary organization
   *
   * @param userId - User ID
   * @returns Primary organization membership or null
   */
  async getPrimaryOrganization(userId: number): Promise<OrganizationMembership | null> {
    return this.membershipRepository.findPrimaryByUser(userId);
  }

  /**
   * Check if user is a member of organization
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns True if user is an active member
   */
  async isUserMember(userId: number, organizationId: number): Promise<boolean> {
    return this.membershipRepository.isUserMember(userId, organizationId);
  }

  /**
   * Get member count for organization
   *
   * @param organizationId - Organization ID
   * @returns Number of active members
   */
  async getMemberCount(organizationId: number): Promise<number> {
    return this.membershipRepository.getMemberCount(organizationId);
  }

  /**
   * Get organization count for user
   *
   * @param userId - User ID
   * @returns Number of organizations user belongs to
   */
  async getOrganizationCount(userId: number): Promise<number> {
    return this.membershipRepository.getOrganizationCount(userId);
  }

  /**
   * Unset all primary organization flags for a user except the specified one
   *
   * @param userId - User ID
   * @param excludeMembershipId - Membership ID to exclude from unsetting
   */
  private async unsetOtherPrimaryMemberships(
    userId: number,
    excludeMembershipId: number,
  ): Promise<void> {
    // Get all primary memberships
    const primaryMemberships = await this.membershipRepository.find({
      where: {
        userId,
        isPrimary: true,
        leftAt: IsNull(),
      },
    });

    // Unset primary flag for all except the excluded one
    for (const membership of primaryMemberships) {
      if (membership.id !== excludeMembershipId) {
        membership.unsetAsPrimary();
        await this.membershipRepository.save(membership);
      }
    }
  }
}
