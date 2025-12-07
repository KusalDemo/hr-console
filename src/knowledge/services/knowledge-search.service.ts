import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KnowledgeArticle, ArticleStatus } from '../entities/knowledge-article.entity';

/**
 * Knowledge Search Service
 * 
 * Provides full-text search capabilities using PostgreSQL full-text search
 */
@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Full-text search articles
   */
  async searchArticles(
    searchTerm: string,
    organizationId?: number,
    categoryId?: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    const query = this.dataSource
      .createQueryBuilder(KnowledgeArticle, 'article')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere(
        `(
          to_tsvector('english', article.title || ' ' || COALESCE(article.excerpt, '') || ' ' || article.content) 
          @@ plainto_tsquery('english', :searchTerm)
        )`,
        { searchTerm },
      )
      .orderBy(
        `ts_rank(
          to_tsvector('english', article.title || ' ' || COALESCE(article.excerpt, '') || ' ' || article.content),
          plainto_tsquery('english', :searchTerm)
        )`,
        'DESC',
      )
      .addOrderBy('article.publishedAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (organizationId !== undefined) {
      query.andWhere(
        '(article.organizationId = :organizationId OR article.organizationId IS NULL)',
        { organizationId },
      );
    }

    if (categoryId !== undefined) {
      query.andWhere('article.categoryId = :categoryId', { categoryId });
    }

    const [articles, total] = await query.getManyAndCount();

    return { articles, total };
  }

  /**
   * Search articles by tags
   */
  async searchByTags(
    tags: string[],
    organizationId?: number,
    limit: number = 20,
  ): Promise<KnowledgeArticle[]> {
    const query = this.dataSource
      .createQueryBuilder(KnowledgeArticle, 'article')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.tags && :tags', { tags })
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
   * Get search suggestions
   */
  async getSearchSuggestions(
    searchTerm: string,
    organizationId?: number,
    limit: number = 10,
  ): Promise<string[]> {
    // Get article titles that match the search term
    const query = this.dataSource
      .createQueryBuilder(KnowledgeArticle, 'article')
      .select('article.title', 'title')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.title ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orderBy('article.viewCount', 'DESC')
      .take(limit);

    if (organizationId !== undefined) {
      query.andWhere(
        '(article.organizationId = :organizationId OR article.organizationId IS NULL)',
        { organizationId },
      );
    }

    const results = await query.getRawMany();
    return results.map((r) => r.title);
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(organizationId?: number, limit: number = 10): Promise<string[]> {
    // This would typically be stored in a separate table
    // For now, we'll return popular article titles
    const query = this.dataSource
      .createQueryBuilder(KnowledgeArticle, 'article')
      .select('article.title', 'title')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .orderBy('article.viewCount', 'DESC')
      .take(limit);

    if (organizationId !== undefined) {
      query.andWhere(
        '(article.organizationId = :organizationId OR article.organizationId IS NULL)',
        { organizationId },
      );
    }

    const results = await query.getRawMany();
    return results.map((r) => r.title);
  }

  /**
   * Update search index for an article
   * This would typically be called after article creation/update
   */
  async updateSearchIndex(articleId: number): Promise<void> {
    // PostgreSQL full-text search indexes are automatically maintained
    // This method can be used for additional index maintenance if needed
    this.logger.log(`Search index updated for article ${articleId}`);
  }
}
