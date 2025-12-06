import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationMembershipRepository } from '../repositories/organization-membership.repository';
import { OrganizationHierarchyService } from './organization-hierarchy.service';
import { Organization, OrganizationStatus } from '../entities/organization.entity';
import { DataSource } from 'typeorm';

/**
 * Organization Statistics Interface
 * Comprehensive statistics for an organization
 */
export interface OrganizationStatistics {
  // Basic counts
  memberCount: number;
  activeMemberCount: number;
  userCount: number; // Same as memberCount for now
  employeeCount: number; // Active members (can be filtered by role later)

  // Hierarchy
  childOrganizationCount: number;
  descendantCount: number; // All descendants including children
  depth: number;
  isRoot: boolean;
  hasParent: boolean;

  // Activity metrics
  recentJoinCount: number; // Members joined in last 30 days
  recentLeaveCount: number; // Members left in last 30 days
  averageMembershipDuration: number; // Average days of membership

  // Usage statistics
  primaryOrganizationCount: number; // Users with this as primary org
  roleDistribution: Record<string, number>; // Count by role

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  oldestMemberJoinedAt: Date | null;
  newestMemberJoinedAt: Date | null;
}

/**
 * Organization Activity Metrics
 * Activity-related statistics for an organization
 */
export interface OrganizationActivityMetrics {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  recentJoins: number; // Last 30 days
  recentLeaves: number; // Last 30 days
  averageMembershipDuration: number; // Days
  growthRate: number; // Percentage change in members over last 30 days
  retentionRate: number; // Percentage of members retained over last 90 days
}

/**
 * Organization Usage Statistics
 * Usage-related statistics for an organization
 */
export interface OrganizationUsageStatistics {
  totalUsers: number;
  primaryUsers: number; // Users with this as primary organization
  secondaryUsers: number; // Users with this as secondary organization
  roleDistribution: Record<string, number>;
  mostCommonRole: string | null;
  usersByRole: Record<string, number[]>;
}

/**
 * Organization Statistics Service
 * 
 * Provides comprehensive statistics for organizations:
 * - User count per organization
 * - Employee count
 * - Activity metrics
 * - Usage statistics
 * - Growth and retention metrics
 * 
 * This service aggregates data from multiple sources to provide
 * insights into organization usage and activity.
 */
@Injectable()
export class OrganizationStatsService {
  private readonly logger = new Logger(OrganizationStatsService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly hierarchyService: OrganizationHierarchyService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get comprehensive statistics for an organization
   * 
   * @param organizationId - Organization ID
   * @returns Complete organization statistics
   */
  async getOrganizationStatistics(organizationId: number): Promise<OrganizationStatistics> {
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Get all memberships for this organization
    const memberships = await this.membershipRepository.findAllForOrganization(
      organizationId,
      true, // Include inactive
    );

    const activeMemberships = memberships.filter((m) => m.isActive());

    // Get member counts
    const memberCount = memberships.length;
    const activeMemberCount = activeMemberships.length;

    // Get child organization count
    const childCount = await this.organizationRepository.hasChildren(organizationId)
      ? (await this.hierarchyService.getDirectChildren(organizationId, false)).length
      : 0;

    // Get descendant count
    const descendants = await this.hierarchyService.getChildOrganizations(organizationId, false);
    const descendantCount = descendants.length;

    // Get depth
    const depth = await this.hierarchyService.getOrganizationDepth(organizationId, false);

    // Calculate activity metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJoins = activeMemberships.filter(
      (m) => m.joinedAt >= thirtyDaysAgo,
    ).length;

    const recentLeaves = memberships.filter(
      (m) => m.leftAt && m.leftAt >= thirtyDaysAgo,
    ).length;

    // Calculate average membership duration
    let totalDuration = 0;
    let activeDurationCount = 0;
    memberships.forEach((m) => {
      const duration = m.getActiveDurationInDays();
      if (duration > 0) {
        totalDuration += duration;
        activeDurationCount++;
      }
    });
    const averageMembershipDuration =
      activeDurationCount > 0 ? totalDuration / activeDurationCount : 0;

    // Get primary organization count
    const primaryCount = activeMemberships.filter((m) => m.isPrimary).length;

    // Calculate role distribution
    const roleDistribution: Record<string, number> = {};
    activeMemberships.forEach((m) => {
      const role = m.role || 'UNASSIGNED';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });

    // Get oldest and newest member join dates
    const joinDates = activeMemberships
      .map((m) => m.joinedAt)
      .filter((date) => date !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const oldestMemberJoinedAt = joinDates.length > 0 ? joinDates[0] : null;
    const newestMemberJoinedAt =
      joinDates.length > 0 ? joinDates[joinDates.length - 1] : null;

    return {
      memberCount,
      activeMemberCount,
      userCount: memberCount, // Same as memberCount for now
      employeeCount: activeMemberCount, // Active members are employees
      childOrganizationCount: childCount,
      descendantCount,
      depth,
      isRoot: !organization.parentOrganizationId,
      hasParent: !!organization.parentOrganizationId,
      recentJoinCount: recentJoins,
      recentLeaveCount: recentLeaves,
      averageMembershipDuration: Math.round(averageMembershipDuration),
      primaryOrganizationCount: primaryCount,
      roleDistribution,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      oldestMemberJoinedAt,
      newestMemberJoinedAt,
    };
  }

  /**
   * Get activity metrics for an organization
   * 
   * @param organizationId - Organization ID
   * @returns Activity metrics
   */
  async getActivityMetrics(organizationId: number): Promise<OrganizationActivityMetrics> {
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const memberships = await this.membershipRepository.findAllForOrganization(
      organizationId,
      true,
    );

    const activeMemberships = memberships.filter((m) => m.isActive());
    const inactiveMemberships = memberships.filter((m) => !m.isActive());

    // Calculate time periods
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Recent joins and leaves
    const recentJoins = activeMemberships.filter((m) => m.joinedAt >= thirtyDaysAgo).length;
    const recentLeaves = memberships.filter(
      (m) => m.leftAt && m.leftAt >= thirtyDaysAgo,
    ).length;

    // Calculate average membership duration
    let totalDuration = 0;
    let activeDurationCount = 0;
    memberships.forEach((m) => {
      const duration = m.getActiveDurationInDays();
      if (duration > 0) {
        totalDuration += duration;
        activeDurationCount++;
      }
    });
    const averageMembershipDuration =
      activeDurationCount > 0 ? totalDuration / activeDurationCount : 0;

    // Calculate growth rate
    const membersThirtyDaysAgo = memberships.filter(
      (m) => m.joinedAt < thirtyDaysAgo && (!m.leftAt || m.leftAt >= thirtyDaysAgo),
    ).length;
    const currentMembers = activeMemberships.length;
    const growthRate =
      membersThirtyDaysAgo > 0
        ? ((currentMembers - membersThirtyDaysAgo) / membersThirtyDaysAgo) * 100
        : 0;

    // Calculate retention rate
    const membersNinetyDaysAgo = memberships.filter(
      (m) => m.joinedAt < ninetyDaysAgo && (!m.leftAt || m.leftAt >= ninetyDaysAgo),
    ).length;
    const retainedMembers = memberships.filter(
      (m) => m.joinedAt < ninetyDaysAgo && m.isActive(),
    ).length;
    const retentionRate =
      membersNinetyDaysAgo > 0 ? (retainedMembers / membersNinetyDaysAgo) * 100 : 0;

    return {
      totalMembers: memberships.length,
      activeMembers: activeMemberships.length,
      inactiveMembers: inactiveMemberships.length,
      recentJoins,
      recentLeaves,
      averageMembershipDuration: Math.round(averageMembershipDuration),
      growthRate: Math.round(growthRate * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
    };
  }

  /**
   * Get usage statistics for an organization
   * 
   * @param organizationId - Organization ID
   * @returns Usage statistics
   */
  async getUsageStatistics(organizationId: number): Promise<OrganizationUsageStatistics> {
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const memberships = await this.membershipRepository.findAllForOrganization(
      organizationId,
      false, // Only active
    );

    const primaryMemberships = memberships.filter((m) => m.isPrimary);
    const secondaryMemberships = memberships.filter((m) => !m.isPrimary);

    // Calculate role distribution
    const roleDistribution: Record<string, number> = {};
    const usersByRole: Record<string, number[]> = {};

    memberships.forEach((m) => {
      const role = m.role || 'UNASSIGNED';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;

      if (!usersByRole[role]) {
        usersByRole[role] = [];
      }
      usersByRole[role].push(m.userId);
    });

    // Find most common role
    let mostCommonRole: string | null = null;
    let maxCount = 0;
    Object.entries(roleDistribution).forEach(([role, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonRole = role;
      }
    });

    return {
      totalUsers: memberships.length,
      primaryUsers: primaryMemberships.length,
      secondaryUsers: secondaryMemberships.length,
      roleDistribution,
      mostCommonRole,
      usersByRole,
    };
  }

  /**
   * Get user count for an organization
   * 
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive members (default: false)
   * @returns User count
   */
  async getUserCount(organizationId: number, includeInactive: boolean = false): Promise<number> {
    return this.membershipRepository.getMemberCount(organizationId);
  }

  /**
   * Get employee count for an organization
   * Currently returns active member count
   * Can be extended to filter by employee role
   * 
   * @param organizationId - Organization ID
   * @returns Employee count
   */
  async getEmployeeCount(organizationId: number): Promise<number> {
    const memberships = await this.membershipRepository.findAllForOrganization(
      organizationId,
      false, // Only active
    );
    return memberships.length;
  }

  /**
   * Get member count by role for an organization
   * 
   * @param organizationId - Organization ID
   * @param role - Role name
   * @returns Count of members with the role
   */
  async getMemberCountByRole(organizationId: number, role: string): Promise<number> {
    const memberships = await this.membershipRepository.findAllForOrganization(
      organizationId,
      false, // Only active
    );

    return memberships.filter((m) => (m.role || 'UNASSIGNED') === role).length;
  }

  /**
   * Get organization growth trend
   * Returns member count over time periods
   * 
   * @param organizationId - Organization ID
   * @param periods - Number of periods to analyze (default: 12 months)
   * @returns Growth trend data
   */
  async getGrowthTrend(
    organizationId: number,
    periods: number = 12,
  ): Promise<Array<{ period: string; count: number }>> {
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const memberships = await this.membershipRepository.findAllForOrganization(
      organizationId,
      true, // Include inactive
    );

    const trend: Array<{ period: string; count: number }> = [];
    const now = new Date();

    for (let i = periods - 1; i >= 0; i--) {
      const periodDate = new Date(now);
      periodDate.setMonth(periodDate.getMonth() - i);
      const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
      const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

      const periodLabel = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;

      // Count members who were active at the end of this period
      const count = memberships.filter((m) => {
        const joinedBeforePeriodEnd = m.joinedAt <= periodEnd;
        const leftAfterPeriodStart = !m.leftAt || m.leftAt >= periodStart;
        return joinedBeforePeriodEnd && leftAfterPeriodStart;
      }).length;

      trend.push({ period: periodLabel, count });
    }

    return trend;
  }
}


