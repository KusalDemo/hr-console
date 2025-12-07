import { Injectable } from '@nestjs/common';
import { DataSource, Repository, ILike, In } from 'typeorm';
import { KnowledgeArticle, ArticleStatus } from '../entities/knowledge-article.entity';

/**
 * Knowledge Article Repository
 * Provides custom queries for knowledge article operations
 */
@Injectable()
export class KnowledgeArticleRepository extends Repository<KnowledgeArticle> {
  constructor(private dataSource: DataSource) {
    super(KnowledgeArticle, dataSource.createEntityManager());
  }

  /**
   * Find article by ID
   */
  async findById(id: number, includeRelations = false): Promise<KnowledgeArticle | null> {
    const query = this.createQueryBuilder('article')
      .where('article.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('article.category', 'category')
        .leftJoinAndSelect('article.organization', 'organization')
        .leftJoinAndSelect('article.attachments', 'attachments')
        .leftJoinAndSelect('article.versions', 'versions');
    }

    return query.getOne();
  }

  /**
   * Find article by slug
   */
  async findBySlug(slug: string): Promise<KnowledgeArticle | null> {
    return this.findOne({
      where: { slug },
      relations: ['category', 'organization'],
    });
  }

  /**
   * Find published articles
   */
  async findPublished(
    organizationId?: number,
    categoryId?: number,
    limit?: number,
  ): Promise<KnowledgeArticle[]> {
    const query = this.createQueryBuilder('article')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.publishedAt IS NOT NULL')
      .orderBy('article.publishedAt', 'DESC');

    if (organizationId !== undefined) {
      query.andWhere(
        '(article.organizationId = :organizationId OR article.organizationId IS NULL)',
        { organizationId },
      );
    }

    if (categoryId !== undefined) {
      query.andWhere('article.categoryId = :categoryId', { categoryId });
    }

    if (limit) {
      query.take(limit);
    }

    return query.getMany();
  }

  /**
   * Find articles with pagination and filters
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      status?: ArticleStatus;
      categoryId?: number;
      organizationId?: number;
      tags?: string[];
      isFeatured?: boolean;
      searchTerm?: string;
    },
  ): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    const query = this.createQueryBuilder('article');

    if (filters?.status) {
      query.andWhere('article.status = :status', { status: filters.status });
    }

    if (filters?.categoryId !== undefined) {
      query.andWhere('article.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters?.organizationId !== undefined) {
      query.andWhere(
        '(article.organizationId = :organizationId OR article.organizationId IS NULL)',
        { organizationId: filters.organizationId },
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere('article.tags && :tags', { tags: filters.tags });
    }

    if (filters?.isFeatured !== undefined) {
      query.andWhere('article.isFeatured = :isFeatured', { isFeatured: filters.isFeatured });
    }

    if (filters?.searchTerm) {
      query.andWhere(
        '(article.title ILIKE :searchTerm OR article.content ILIKE :searchTerm OR article.excerpt ILIKE :searchTerm)',
        { searchTerm: `%${filters.searchTerm}%` },
      );
    }

    query
      .orderBy('article.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [articles, total] = await query.getManyAndCount();

    return { articles, total };
  }

  /**
   * Find featured articles
   */
  async findFeatured(organizationId?: number, limit: number = 10): Promise<KnowledgeArticle[]> {
    const query = this.createQueryBuilder('article')
      .where('article.isFeatured = :isFeatured', { isFeatured: true })
      .andWhere('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .orderBy('article.publishedAt', 'DESC')
      .take(limit);

    if (organizationId !== undefined) {
      query.andWhere(
        '(article.organizationId = :organizationId OR article.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getMany();
  }

  /**
   * Increment view count
   */
  async incrementViewCount(articleId: number): Promise<void> {
    await this.increment({ id: articleId }, 'viewCount', 1);
  }

  /**
   * Increment helpful count
   */
  async incrementHelpfulCount(articleId: number): Promise<void> {
    await this.increment({ id: articleId }, 'helpfulCount', 1);
  }

  /**
   * Increment not helpful count
   */
  async incrementNotHelpfulCount(articleId: number): Promise<void> {
    await this.increment({ id: articleId }, 'notHelpfulCount', 1);
  }

  /**
   * Get article statistics
   */
  async getArticleStatistics(organizationId?: number): Promise<{
    total: number;
    published: number;
    draft: number;
    pendingReview: number;
    byCategory: Record<string, number>;
  }> {
    const query = this.createQueryBuilder('article');

    if (organizationId !== undefined) {
      query.andWhere(
        '(article.organizationId = :organizationId OR article.organizationId IS NULL)',
        { organizationId },
      );
    }

    const articles = await query.getMany();

    const stats = {
      total: articles.length,
      published: 0,
      draft: 0,
      pendingReview: 0,
      byCategory: {} as Record<string, number>,
    };

    articles.forEach((article) => {
      if (article.status === ArticleStatus.PUBLISHED) {
        stats.published++;
      } else if (article.status === ArticleStatus.DRAFT) {
        stats.draft++;
      } else if (article.status === ArticleStatus.PENDING_REVIEW) {
        stats.pendingReview++;
      }

      if (article.categoryId) {
        const categoryKey = `category_${article.categoryId}`;
        stats.byCategory[categoryKey] = (stats.byCategory[categoryKey] || 0) + 1;
      }
    });

    return stats;
  }
}
