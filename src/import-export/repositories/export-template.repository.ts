import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExportTemplate } from '../entities/export-template.entity';

/**
 * Export Template Repository
 * Provides custom queries for export template operations
 */
@Injectable()
export class ExportTemplateRepository extends Repository<ExportTemplate> {
  constructor(private dataSource: DataSource) {
    super(ExportTemplate, dataSource.createEntityManager());
  }

  /**
   * Find template by ID
   */
  async findById(id: number, includeRelations = false): Promise<ExportTemplate | null> {
    const query = this.createQueryBuilder('template')
      .where('template.id = :id', { id })
      .andWhere('template.isActive = :isActive', { isActive: true });

    if (includeRelations) {
      query
        .leftJoinAndSelect('template.organization', 'organization')
        .leftJoinAndSelect('template.exportJobs', 'jobs');
    }

    return query.getOne();
  }

  /**
   * Find templates by entity type
   */
  async findByEntityType(entityType: string, organizationId?: number): Promise<ExportTemplate[]> {
    const query = this.createQueryBuilder('template')
      .where('template.entityType = :entityType', { entityType })
      .andWhere('template.isActive = :isActive', { isActive: true })
      .orderBy('template.name', 'ASC');

    if (organizationId !== undefined) {
      query.andWhere(
        '(template.organizationId = :organizationId OR template.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getMany();
  }

  /**
   * Find templates by organization
   */
  async findByOrganization(organizationId: number): Promise<ExportTemplate[]> {
    return this.find({
      where: {
        organizationId,
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find global templates (organizationId is null)
   */
  async findGlobalTemplates(entityType?: string): Promise<ExportTemplate[]> {
    const query = this.createQueryBuilder('template')
      .where('template.organizationId IS NULL')
      .andWhere('template.isActive = :isActive', { isActive: true })
      .orderBy('template.name', 'ASC');

    if (entityType) {
      query.andWhere('template.entityType = :entityType', { entityType });
    }

    return query.getMany();
  }

  /**
   * Find templates with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      entityType?: string;
      organizationId?: number;
      isActive?: boolean;
    },
  ): Promise<{ templates: ExportTemplate[]; total: number }> {
    const query = this.createQueryBuilder('template');

    if (filters?.entityType) {
      query.andWhere('template.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters?.organizationId !== undefined) {
      query.andWhere(
        '(template.organizationId = :organizationId OR template.organizationId IS NULL)',
        { organizationId: filters.organizationId },
      );
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive: filters.isActive });
    }

    query
      .orderBy('template.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [templates, total] = await query.getManyAndCount();

    return { templates, total };
  }

  /**
   * Check if template name exists
   */
  async nameExists(
    name: string,
    organizationId: number | null,
    excludeId?: number,
  ): Promise<boolean> {
    const query = this.createQueryBuilder('template')
      .where('template.name = :name', { name })
      .andWhere('template.organizationId = :organizationId', { organizationId });

    if (excludeId) {
      query.andWhere('template.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count templates by entity type
   */
  async countByEntityType(entityType: string, organizationId?: number): Promise<number> {
    const query = this.createQueryBuilder('template')
      .where('template.entityType = :entityType', { entityType })
      .andWhere('template.isActive = :isActive', { isActive: true });

    if (organizationId !== undefined) {
      query.andWhere(
        '(template.organizationId = :organizationId OR template.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getCount();
  }
}
