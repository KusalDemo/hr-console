import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { KnowledgeCategory } from '../entities/knowledge-category.entity';

/**
 * Knowledge Category Repository
 * Provides custom queries for knowledge category operations
 */
@Injectable()
export class KnowledgeCategoryRepository extends Repository<KnowledgeCategory> {
  constructor(private dataSource: DataSource) {
    super(KnowledgeCategory, dataSource.createEntityManager());
  }

  /**
   * Find category by ID
   */
  async findById(id: number, includeRelations = false): Promise<KnowledgeCategory | null> {
    const query = this.createQueryBuilder('category')
      .where('category.id = :id', { id })
      .andWhere('category.isActive = :isActive', { isActive: true });

    if (includeRelations) {
      query
        .leftJoinAndSelect('category.parent', 'parent')
        .leftJoinAndSelect('category.children', 'children')
        .leftJoinAndSelect('category.organization', 'organization');
    }

    return query.getOne();
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<KnowledgeCategory | null> {
    return this.findOne({
      where: { slug, isActive: true },
      relations: ['parent', 'children'],
    });
  }

  /**
   * Find categories by organization
   */
  async findByOrganization(organizationId: number | null): Promise<KnowledgeCategory[]> {
    const query = this.createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true })
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    if (organizationId !== null) {
      query.andWhere(
        '(category.organizationId = :organizationId OR category.organizationId IS NULL)',
        { organizationId },
      );
    } else {
      query.andWhere('category.organizationId IS NULL');
    }

    return query.getMany();
  }

  /**
   * Find root categories (no parent)
   */
  async findRootCategories(organizationId?: number): Promise<KnowledgeCategory[]> {
    const query = this.createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .andWhere('category.isActive = :isActive', { isActive: true })
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    if (organizationId !== undefined) {
      query.andWhere(
        '(category.organizationId = :organizationId OR category.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getMany();
  }

  /**
   * Find child categories
   */
  async findChildCategories(parentId: number): Promise<KnowledgeCategory[]> {
    return this.find({
      where: {
        parentId,
        isActive: true,
      },
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  /**
   * Check if slug exists
   */
  async slugExists(
    slug: string,
    organizationId: number | null,
    excludeId?: number,
  ): Promise<boolean> {
    const query = this.createQueryBuilder('category')
      .where('category.slug = :slug', { slug })
      .andWhere('category.organizationId = :organizationId', { organizationId });

    if (excludeId) {
      query.andWhere('category.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
