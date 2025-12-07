import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Not } from 'typeorm';
import {
  Organization,
  OrganizationType,
  OrganizationStatus,
} from '../entities/organization.entity';

/**
 * Organization Repository
 * Provides custom queries for organization operations with tenant filtering
 *
 * Note: Organizations are stored in tenant schemas, so all queries
 * are automatically scoped to the current tenant context.
 */
@Injectable()
export class OrganizationRepository extends Repository<Organization> {
  constructor(private dataSource: DataSource) {
    super(Organization, dataSource.createEntityManager());
  }

  /**
   * Find organization by organization key (case-insensitive)
   * Only returns active organizations by default
   */
  async findByKey(organizationKey: string, includeInactive = false): Promise<Organization | null> {
    const where: any = {
      organizationKey: organizationKey.trim().toLowerCase(),
    };

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.findOne({
      where,
      relations: ['parentOrganization'],
    });
  }

  /**
   * Find organization by ID
   * Only returns active organizations by default
   */
  async findById(id: number, includeInactive = false): Promise<Organization | null> {
    const where: any = { id };

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.findOne({
      where,
      relations: ['parentOrganization'],
    });
  }

  /**
   * Find organization by ID including inactive organizations
   * Used for organization management operations
   */
  async findByIdIncludeInactive(id: number): Promise<Organization | null> {
    return this.findById(id, true);
  }

  /**
   * Find all active organizations
   */
  async findAllActive(): Promise<Organization[]> {
    return this.find({
      where: {
        status: OrganizationStatus.ACTIVE,
      },
      relations: ['parentOrganization'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find all organizations (including inactive)
   * Used for admin operations
   */
  async findAll(includeInactive = false): Promise<Organization[]> {
    const where: any = {};

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.find({
      where,
      relations: ['parentOrganization'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find root organizations (no parent)
   * Only returns active organizations by default
   */
  async findRootOrganizations(includeInactive = false): Promise<Organization[]> {
    const where: any = {
      parentOrganizationId: null,
    };

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.find({
      where,
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find organizations by parent organization ID
   * Only returns active organizations by default
   */
  async findByParentId(parentId: number, includeInactive = false): Promise<Organization[]> {
    const where: any = {
      parentOrganizationId: parentId,
    };

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.find({
      where,
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find organizations by type
   * Only returns active organizations by default
   */
  async findByType(type: OrganizationType, includeInactive = false): Promise<Organization[]> {
    const where: any = {
      organizationType: type,
    };

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.find({
      where,
      relations: ['parentOrganization'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find default organization
   * Returns the default organization for the tenant
   */
  async findDefault(includeInactive = false): Promise<Organization | null> {
    const where: any = {
      isDefault: true,
    };

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.findOne({
      where,
      relations: ['parentOrganization'],
    });
  }

  /**
   * Find organizations by status
   */
  async findByStatus(status: OrganizationStatus): Promise<Organization[]> {
    return this.find({
      where: {
        status,
      },
      relations: ['parentOrganization'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Check if organization key already exists
   */
  async organizationKeyExists(organizationKey: string, excludeId?: number): Promise<boolean> {
    const where: any = {
      organizationKey: organizationKey.trim().toLowerCase(),
    };

    if (excludeId) {
      where.id = Not(excludeId);
    }

    const count = await this.count({
      where,
    });

    return count > 0;
  }

  /**
   * Find organizations with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    includeInactive = false,
    filters?: {
      parentId?: number | null;
      type?: OrganizationType;
      status?: OrganizationStatus;
      search?: string;
    },
  ): Promise<{ organizations: Organization[]; total: number }> {
    const queryBuilder = this.createQueryBuilder('organization').leftJoinAndSelect(
      'organization.parentOrganization',
      'parent',
    );

    if (!includeInactive) {
      queryBuilder.where('organization.status = :status', {
        status: OrganizationStatus.ACTIVE,
      });
    }

    if (filters) {
      if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
          queryBuilder.andWhere('organization.parentOrganizationId IS NULL');
        } else {
          queryBuilder.andWhere('organization.parentOrganizationId = :parentId', {
            parentId: filters.parentId,
          });
        }
      }

      if (filters.type) {
        queryBuilder.andWhere('organization.organizationType = :type', {
          type: filters.type,
        });
      }

      if (filters.status) {
        queryBuilder.andWhere('organization.status = :status', {
          status: filters.status,
        });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(LOWER(organization.name) LIKE LOWER(:search) OR LOWER(organization.organizationKey) LIKE LOWER(:search))',
          { search: `%${filters.search.trim()}%` },
        );
      }
    }

    queryBuilder
      .orderBy('organization.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [organizations, total] = await queryBuilder.getManyAndCount();

    return { organizations, total };
  }

  /**
   * Search organizations by name or key
   */
  async search(searchTerm: string, includeInactive = false): Promise<Organization[]> {
    const queryBuilder = this.createQueryBuilder('organization')
      .leftJoinAndSelect('organization.parentOrganization', 'parent')
      .where(
        '(LOWER(organization.name) LIKE LOWER(:searchTerm) OR LOWER(organization.organizationKey) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${searchTerm.trim()}%` },
      )
      .orderBy('organization.name', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('organization.status = :status', {
        status: OrganizationStatus.ACTIVE,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Count active organizations
   */
  async countActive(): Promise<number> {
    return this.count({
      where: {
        status: OrganizationStatus.ACTIVE,
      },
    });
  }

  /**
   * Count organizations by type
   */
  async countByType(type: OrganizationType): Promise<number> {
    return this.count({
      where: {
        organizationType: type,
        status: OrganizationStatus.ACTIVE,
      },
    });
  }

  /**
   * Get organization hierarchy (tree structure)
   * Returns all organizations with their parent-child relationships
   */
  async getHierarchy(includeInactive = false): Promise<Organization[]> {
    const where: any = {};

    if (!includeInactive) {
      where.status = OrganizationStatus.ACTIVE;
    }

    return this.find({
      where,
      relations: ['parentOrganization', 'childOrganizations'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find all descendants of an organization
   * @param organizationId - Parent organization ID
   * @returns All descendant organizations
   */
  async findDescendants(organizationId: number): Promise<Organization[]> {
    // Use recursive CTE to find all descendants
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_organization_id, name, organization_key
        FROM organizations
        WHERE parent_organization_id = $1
        UNION ALL
        SELECT o.id, o.parent_organization_id, o.name, o.organization_key
        FROM organizations o
        INNER JOIN descendants d ON o.parent_organization_id = d.id
      )
      SELECT * FROM descendants
      ORDER BY name ASC
    `;

    return this.query(query, [organizationId]);
  }

  /**
   * Find all ancestors of an organization
   * @param organizationId - Organization ID
   * @returns All ancestor organizations (parent, grandparent, etc.)
   */
  async findAncestors(organizationId: number): Promise<Organization[]> {
    // Use recursive CTE to find all ancestors
    const query = `
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_organization_id, name, organization_key
        FROM organizations
        WHERE id = $1
        UNION ALL
        SELECT o.id, o.parent_organization_id, o.name, o.organization_key
        FROM organizations o
        INNER JOIN ancestors a ON o.id = a.parent_organization_id
      )
      SELECT * FROM ancestors
      WHERE id != $1
      ORDER BY name ASC
    `;

    return this.query(query, [organizationId]);
  }

  /**
   * Check if organization has children
   */
  async hasChildren(organizationId: number): Promise<boolean> {
    const count = await this.count({
      where: {
        parentOrganizationId: organizationId,
      },
    });

    return count > 0;
  }

  /**
   * Get organization depth in hierarchy
   * Returns 0 for root organizations, 1 for direct children, etc.
   */
  async getDepth(organizationId: number): Promise<number> {
    const ancestors = await this.findAncestors(organizationId);
    return ancestors.length;
  }
}
