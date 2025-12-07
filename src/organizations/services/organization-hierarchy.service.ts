import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { Organization, OrganizationStatus } from '../entities/organization.entity';

/**
 * Organization Tree Node
 * Represents an organization with its children in a tree structure
 */
export interface OrganizationTreeNode {
  organization: Organization;
  children: OrganizationTreeNode[];
  depth: number;
  path: number[]; // Array of organization IDs from root to this node
}

/**
 * Organization Hierarchy Service
 *
 * Provides functionality for managing organization hierarchies:
 * - Build organization tree
 * - Get parent organizations
 * - Get child organizations
 * - Validate hierarchy (prevent cycles)
 * - Get organization path (root to organization)
 * - Get organization depth
 *
 * This service helps manage the hierarchical structure of organizations
 * within a tenant, ensuring data integrity and preventing circular references.
 */
@Injectable()
export class OrganizationHierarchyService {
  private readonly logger = new Logger(OrganizationHierarchyService.name);

  constructor(private readonly organizationRepository: OrganizationRepository) {}

  /**
   * Build organization tree
   * Recursively builds a tree structure starting from root organizations
   *
   * @param includeInactive - Include inactive organizations (default: false)
   * @param rootOrganizationId - Specific root organization ID to build tree from (optional)
   * @returns Array of root organization tree nodes
   */
  async buildTree(
    includeInactive: boolean = false,
    rootOrganizationId?: number,
  ): Promise<OrganizationTreeNode[]> {
    if (rootOrganizationId) {
      // Build tree from specific root organization
      const root = await this.organizationRepository.findById(rootOrganizationId, includeInactive);
      if (!root) {
        throw new NotFoundException(`Organization with ID ${rootOrganizationId} not found`);
      }

      return [await this.buildNodeTree(root, includeInactive, 0, [root.id])];
    }

    // Build tree from all root organizations
    const rootOrganizations =
      await this.organizationRepository.findRootOrganizations(includeInactive);

    const tree: OrganizationTreeNode[] = [];
    for (const root of rootOrganizations) {
      tree.push(await this.buildNodeTree(root, includeInactive, 0, [root.id]));
    }

    return tree;
  }

  /**
   * Build tree node recursively
   *
   * @param organization - Organization entity
   * @param includeInactive - Include inactive organizations
   * @param depth - Current depth in tree
   * @param path - Path from root to this node
   * @returns Tree node with children
   */
  private async buildNodeTree(
    organization: Organization,
    includeInactive: boolean,
    depth: number,
    path: number[],
  ): Promise<OrganizationTreeNode> {
    // Get direct children
    const children = await this.getDirectChildren(organization.id, includeInactive);

    // Build children tree nodes recursively
    const childNodes: OrganizationTreeNode[] = [];
    for (const child of children) {
      // Prevent cycles by checking if child is already in path
      if (path.includes(child.id)) {
        this.logger.error(
          `Circular reference detected: Organization ${child.id} is already in path ${path.join(' -> ')}`,
        );
        throw new BadRequestException(
          `Circular reference detected in organization hierarchy: ${child.name} (ID: ${child.id})`,
        );
      }

      const childPath = [...path, child.id];
      childNodes.push(await this.buildNodeTree(child, includeInactive, depth + 1, childPath));
    }

    return {
      organization,
      children: childNodes,
      depth,
      path: [...path],
    };
  }

  /**
   * Get parent organizations
   * Returns all ancestors (parent, grandparent, etc.) of an organization
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Array of parent organizations (ordered from immediate parent to root)
   */
  async getParentOrganizations(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<Organization[]> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      includeInactive,
    );
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return this.organizationRepository.findAncestors(organizationId);
  }

  /**
   * Get immediate parent organization
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Parent organization or null if root
   */
  async getParentOrganization(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<Organization | null> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      includeInactive,
    );
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    if (!organization.parentOrganizationId) {
      return null;
    }

    return this.organizationRepository.findById(organization.parentOrganizationId, includeInactive);
  }

  /**
   * Get child organizations
   * Returns all descendants (children, grandchildren, etc.) of an organization
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Array of child organizations
   */
  async getChildOrganizations(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<Organization[]> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      includeInactive,
    );
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return this.organizationRepository.findDescendants(organizationId);
  }

  /**
   * Get direct children (immediate children only)
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Array of direct child organizations
   */
  async getDirectChildren(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<Organization[]> {
    const where: any = {
      parentOrganizationId: organizationId,
    };

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.organizationRepository.find({
      where,
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Get organization path
   * Returns array of organization IDs from root to the specified organization
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Array of organization IDs (root to organization)
   */
  async getOrganizationPath(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<number[]> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      includeInactive,
    );
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const ancestors = await this.organizationRepository.findAncestors(organizationId);
    const path = ancestors.map((ancestor) => ancestor.id);
    path.push(organizationId); // Include the organization itself

    return path;
  }

  /**
   * Get organization depth
   * Returns the depth of an organization in the hierarchy (0 for root)
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Depth (0 = root, 1 = first level child, etc.)
   */
  async getOrganizationDepth(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<number> {
    const path = await this.getOrganizationPath(organizationId, includeInactive);
    return path.length - 1; // Depth is path length minus 1 (root has depth 0)
  }

  /**
   * Get root organization
   * Returns the root organization (top-level ancestor) of an organization
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Root organization
   */
  async getRootOrganization(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      includeInactive,
    );
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    if (!organization.parentOrganizationId) {
      return organization; // Already root
    }

    const ancestors = await this.organizationRepository.findAncestors(organizationId);
    if (ancestors.length === 0) {
      return organization;
    }

    // Root is the last ancestor (oldest parent)
    return ancestors[ancestors.length - 1];
  }

  /**
   * Validate hierarchy
   * Checks if setting a parent organization would create a cycle
   *
   * @param organizationId - Organization ID to update
   * @param newParentId - New parent organization ID (or null for root)
   * @throws BadRequestException if cycle would be created
   */
  async validateHierarchy(organizationId: number, newParentId: number | null): Promise<void> {
    // If setting to null (root), no cycle possible
    if (newParentId === null) {
      return;
    }

    // Cannot set organization as its own parent
    if (organizationId === newParentId) {
      throw new BadRequestException('Organization cannot be its own parent');
    }

    // Check if new parent is a descendant of this organization
    // If so, setting it as parent would create a cycle
    const descendants = await this.organizationRepository.findDescendants(organizationId);
    const wouldCreateCycle = descendants.some((descendant) => descendant.id === newParentId);

    if (wouldCreateCycle) {
      const newParent = await this.organizationRepository.findById(newParentId, true);
      throw new BadRequestException(
        `Cannot set parent organization: ${newParent?.name || newParentId} is a descendant of this organization. This would create a circular reference.`,
      );
    }
  }

  /**
   * Check if organization is ancestor of another
   *
   * @param ancestorId - Potential ancestor organization ID
   * @param descendantId - Potential descendant organization ID
   * @returns True if ancestorId is an ancestor of descendantId
   */
  async isAncestor(ancestorId: number, descendantId: number): Promise<boolean> {
    if (ancestorId === descendantId) {
      return false; // Organization is not its own ancestor
    }

    const descendants = await this.organizationRepository.findDescendants(ancestorId);
    return descendants.some((descendant) => descendant.id === descendantId);
  }

  /**
   * Check if organization is descendant of another
   *
   * @param descendantId - Potential descendant organization ID
   * @param ancestorId - Potential ancestor organization ID
   * @returns True if descendantId is a descendant of ancestorId
   */
  async isDescendant(descendantId: number, ancestorId: number): Promise<boolean> {
    return this.isAncestor(ancestorId, descendantId);
  }

  /**
   * Get all root organizations
   * Returns all organizations that have no parent
   *
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Array of root organizations
   */
  async getRootOrganizations(includeInactive: boolean = false): Promise<Organization[]> {
    return this.organizationRepository.findRootOrganizations(includeInactive);
  }

  /**
   * Get organization siblings
   * Returns all organizations that share the same parent
   *
   * @param organizationId - Organization ID
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Array of sibling organizations (excluding the organization itself)
   */
  async getSiblings(
    organizationId: number,
    includeInactive: boolean = false,
  ): Promise<Organization[]> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      includeInactive,
    );
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    if (!organization.parentOrganizationId) {
      // If root, return all other root organizations
      const roots = await this.organizationRepository.findRootOrganizations(includeInactive);
      return roots.filter((root) => root.id !== organizationId);
    }

    // Get all organizations with same parent
    const siblings = await this.getDirectChildren(
      organization.parentOrganizationId,
      includeInactive,
    );
    return siblings.filter((sibling) => sibling.id !== organizationId);
  }

  /**
   * Get organization count by level
   * Returns count of organizations at each depth level
   *
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Map of depth level to organization count
   */
  async getCountByLevel(includeInactive: boolean = false): Promise<Map<number, number>> {
    const allOrganizations = includeInactive
      ? await this.organizationRepository.findAll(true)
      : await this.organizationRepository.findAllActive();

    const countByLevel = new Map<number, number>();

    for (const org of allOrganizations) {
      const depth = await this.getOrganizationDepth(org.id, includeInactive);
      countByLevel.set(depth, (countByLevel.get(depth) || 0) + 1);
    }

    return countByLevel;
  }
}

