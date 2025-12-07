import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KnowledgeArticleRepository, KnowledgeCategoryRepository } from '../repositories';
import { KnowledgeSearchService } from './knowledge-search.service';
import {
  KnowledgeArticle,
  ArticleStatus,
  KnowledgeCategory,
  KnowledgeArticleVersion,
  KnowledgeArticleView,
  KnowledgeArticleFeedback,
  FeedbackType,
} from '../entities';
import {
  CreateKnowledgeArticleDto,
  UpdateKnowledgeArticleDto,
  CreateKnowledgeCategoryDto,
  UpdateKnowledgeCategoryDto,
  KnowledgeArticleResponseDto,
  KnowledgeCategoryResponseDto,
  SubmitArticleForReviewDto,
  ApproveArticleDto,
  PublishArticleDto,
} from '../dto';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';

/**
 * Knowledge Service
 *
 * Manages knowledge base operations:
 * - Article CRUD
 * - Article versioning
 * - Draft/published workflow
 * - Approval process
 * - Categories management
 * - Analytics tracking
 */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly articleRepository: KnowledgeArticleRepository,
    private readonly categoryRepository: KnowledgeCategoryRepository,
    private readonly searchService: KnowledgeSearchService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== Article Operations ====================

  /**
   * Create article
   */
  async createArticle(
    createDto: CreateKnowledgeArticleDto,
    createdBy?: number,
  ): Promise<KnowledgeArticleResponseDto> {
    this.logger.log(`Creating knowledge article: ${createDto.title}`);

    // Validate organization if provided
    if (createDto.organizationId) {
      const organization = await this.organizationRepository.findById(createDto.organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
      }
    }

    // Validate category if provided
    if (createDto.categoryId) {
      const category = await this.categoryRepository.findById(createDto.categoryId);
      if (!category) {
        throw new NotFoundException(`Category not found: ${createDto.categoryId}`);
      }
    }

    // Check if slug exists
    const slugExists = await this.articleRepository.findOne({
      where: { slug: createDto.slug },
    });
    if (slugExists) {
      throw new ConflictException(`Article with slug '${createDto.slug}' already exists`);
    }

    try {
      const article = this.articleRepository.create({
        title: createDto.title,
        slug: createDto.slug,
        content: createDto.content,
        excerpt: createDto.excerpt || null,
        status: createDto.status || ArticleStatus.DRAFT,
        categoryId: createDto.categoryId || null,
        organizationId: createDto.organizationId || null,
        tags: createDto.tags || null,
        currentVersion: 1,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        permissions: createDto.permissions || null,
        isFeatured: createDto.isFeatured || false,
        allowsFeedback: createDto.allowsFeedback ?? true,
        seoMetadata: createDto.seoMetadata || null,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.articleRepository.save(article);

      // Create initial version
      await this.createArticleVersion(saved.id, saved, createdBy);

      return KnowledgeArticleResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create article: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get article by ID
   */
  async getArticleById(id: number): Promise<KnowledgeArticleResponseDto> {
    const article = await this.articleRepository.findById(id, true);
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }
    return KnowledgeArticleResponseDto.fromEntity(article);
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<KnowledgeArticleResponseDto> {
    const article = await this.articleRepository.findBySlug(slug);
    if (!article) {
      throw new NotFoundException(`Article not found: ${slug}`);
    }
    return KnowledgeArticleResponseDto.fromEntity(article);
  }

  /**
   * Update article
   */
  async updateArticle(
    id: number,
    updateDto: UpdateKnowledgeArticleDto,
    updatedBy?: number,
  ): Promise<KnowledgeArticleResponseDto> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    // Check slug uniqueness if slug is being updated
    if (updateDto.slug && updateDto.slug !== article.slug) {
      const slugExists = await this.articleRepository.findOne({
        where: { slug: updateDto.slug },
      });
      if (slugExists) {
        throw new ConflictException(`Article with slug '${updateDto.slug}' already exists`);
      }
    }

    // Validate category if provided
    if (updateDto.categoryId !== undefined && updateDto.categoryId !== null) {
      const category = await this.categoryRepository.findById(updateDto.categoryId);
      if (!category) {
        throw new NotFoundException(`Category not found: ${updateDto.categoryId}`);
      }
    }

    try {
      const oldContent = {
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
      };

      Object.assign(article, {
        ...updateDto,
        updatedBy: updatedBy || null,
      });

      const saved = await this.articleRepository.save(article);

      // Create new version if content changed
      if (
        updateDto.title !== oldContent.title ||
        updateDto.content !== oldContent.content ||
        updateDto.excerpt !== oldContent.excerpt
      ) {
        saved.currentVersion += 1;
        await this.articleRepository.save(saved);
        await this.createArticleVersion(saved.id, saved, updatedBy);
      }

      // Update search index
      await this.searchService.updateSearchIndex(saved.id);

      return KnowledgeArticleResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update article: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Delete article
   */
  async deleteArticle(id: number): Promise<void> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    await this.articleRepository.remove(article);
  }

  /**
   * Submit article for review
   */
  async submitForReview(
    id: number,
    submitDto: SubmitArticleForReviewDto,
  ): Promise<KnowledgeArticleResponseDto> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    if (article.status !== ArticleStatus.DRAFT) {
      throw new BadRequestException(
        `Article must be in DRAFT status to submit for review. Current status: ${article.status}`,
      );
    }

    article.status = ArticleStatus.PENDING_REVIEW;
    await this.articleRepository.save(article);

    return KnowledgeArticleResponseDto.fromEntity(article);
  }

  /**
   * Approve article
   */
  async approveArticle(
    id: number,
    approveDto: ApproveArticleDto,
    approvedBy: number,
  ): Promise<KnowledgeArticleResponseDto> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    if (article.status !== ArticleStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Article must be in PENDING_REVIEW status to approve. Current status: ${article.status}`,
      );
    }

    article.status = ArticleStatus.APPROVED;
    article.approvedAt = new Date();
    article.approvedBy = approvedBy;
    await this.articleRepository.save(article);

    return KnowledgeArticleResponseDto.fromEntity(article);
  }

  /**
   * Publish article
   */
  async publishArticle(
    id: number,
    publishDto: PublishArticleDto,
    publishedBy: number,
  ): Promise<KnowledgeArticleResponseDto> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    if (article.status !== ArticleStatus.APPROVED && article.status !== ArticleStatus.DRAFT) {
      throw new BadRequestException(
        `Article must be in APPROVED or DRAFT status to publish. Current status: ${article.status}`,
      );
    }

    article.status = ArticleStatus.PUBLISHED;
    article.publishedAt = publishDto.publishedAt ? new Date(publishDto.publishedAt) : new Date();
    article.publishedBy = publishedBy;
    await this.articleRepository.save(article);

    // Update search index
    await this.searchService.updateSearchIndex(article.id);

    return KnowledgeArticleResponseDto.fromEntity(article);
  }

  /**
   * Track article view
   */
  async trackView(
    articleId: number,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      return; // Silently fail for analytics
    }

    // Increment view count
    await this.articleRepository.incrementViewCount(articleId);

    // Create view record
    const view = this.dataSource.getRepository(KnowledgeArticleView).create({
      articleId,
      userId: userId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    await this.dataSource.getRepository(KnowledgeArticleView).save(view);
  }

  /**
   * Submit article feedback
   */
  async submitFeedback(
    articleId: number,
    feedbackType: FeedbackType,
    userId?: number,
    comment?: string,
    ipAddress?: string,
  ): Promise<void> {
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      throw new NotFoundException(`Article not found: ${articleId}`);
    }

    if (!article.allowsFeedback) {
      throw new BadRequestException('Feedback is not allowed for this article');
    }

    // Create feedback record
    const feedback = this.dataSource.getRepository(KnowledgeArticleFeedback).create({
      articleId,
      userId: userId || null,
      feedbackType,
      comment: comment || null,
      ipAddress: ipAddress || null,
    });

    await this.dataSource.getRepository(KnowledgeArticleFeedback).save(feedback);

    // Update helpful/not helpful counts
    if (feedbackType === FeedbackType.HELPFUL) {
      await this.articleRepository.incrementHelpfulCount(articleId);
    } else if (feedbackType === FeedbackType.NOT_HELPFUL) {
      await this.articleRepository.incrementNotHelpfulCount(articleId);
    }
  }

  /**
   * Get articles with pagination
   */
  async getArticles(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: ArticleStatus;
      categoryId?: number;
      organizationId?: number;
      tags?: string[];
      isFeatured?: boolean;
      searchTerm?: string;
    },
  ): Promise<{ articles: KnowledgeArticleResponseDto[]; total: number }> {
    const result = await this.articleRepository.findWithPagination(page, limit, filters);
    return {
      articles: result.articles.map((a) => KnowledgeArticleResponseDto.fromEntity(a)),
      total: result.total,
    };
  }

  /**
   * Get published articles
   */
  async getPublishedArticles(
    organizationId?: number,
    categoryId?: number,
    limit?: number,
  ): Promise<KnowledgeArticleResponseDto[]> {
    const articles = await this.articleRepository.findPublished(organizationId, categoryId, limit);
    return articles.map((a) => KnowledgeArticleResponseDto.fromEntity(a));
  }

  /**
   * Get featured articles
   */
  async getFeaturedArticles(
    organizationId?: number,
    limit: number = 10,
  ): Promise<KnowledgeArticleResponseDto[]> {
    const articles = await this.articleRepository.findFeatured(organizationId, limit);
    return articles.map((a) => KnowledgeArticleResponseDto.fromEntity(a));
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
    return this.articleRepository.getArticleStatistics(organizationId);
  }

  /**
   * Create article version
   */
  private async createArticleVersion(
    articleId: number,
    article: KnowledgeArticle,
    createdBy?: number,
  ): Promise<KnowledgeArticleVersion> {
    // Mark previous versions as not current
    await this.dataSource
      .getRepository(KnowledgeArticleVersion)
      .update({ articleId, isCurrent: true }, { isCurrent: false });

    // Create new version
    const version = this.dataSource.getRepository(KnowledgeArticleVersion).create({
      articleId,
      versionNumber: article.currentVersion,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      isCurrent: true,
      createdBy: createdBy || null,
    });

    return this.dataSource.getRepository(KnowledgeArticleVersion).save(version);
  }

  // ==================== Category Operations ====================

  /**
   * Create category
   */
  async createCategory(
    createDto: CreateKnowledgeCategoryDto,
    createdBy?: number,
  ): Promise<KnowledgeCategoryResponseDto> {
    // Validate organization if provided
    if (createDto.organizationId) {
      const organization = await this.organizationRepository.findById(createDto.organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
      }
    }

    // Validate parent category if provided
    if (createDto.parentId) {
      const parent = await this.categoryRepository.findById(createDto.parentId);
      if (!parent) {
        throw new NotFoundException(`Parent category not found: ${createDto.parentId}`);
      }
    }

    // Check if slug exists
    const slugExists = await this.categoryRepository.slugExists(
      createDto.slug,
      createDto.organizationId || null,
    );
    if (slugExists) {
      throw new ConflictException(`Category with slug '${createDto.slug}' already exists`);
    }

    try {
      const category = this.categoryRepository.create({
        name: createDto.name,
        slug: createDto.slug,
        description: createDto.description || null,
        parentId: createDto.parentId || null,
        organizationId: createDto.organizationId || null,
        displayOrder: createDto.displayOrder || 0,
        isActive: true,
        icon: createDto.icon || null,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.categoryRepository.save(category);
      return KnowledgeCategoryResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create category: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<KnowledgeCategoryResponseDto> {
    const category = await this.categoryRepository.findById(id, true);
    if (!category) {
      throw new NotFoundException(`Category not found: ${id}`);
    }
    return KnowledgeCategoryResponseDto.fromEntity(category);
  }

  /**
   * Update category
   */
  async updateCategory(
    id: number,
    updateDto: UpdateKnowledgeCategoryDto,
    updatedBy?: number,
  ): Promise<KnowledgeCategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category not found: ${id}`);
    }

    // Check slug uniqueness if slug is being updated
    if (updateDto.slug && updateDto.slug !== category.slug) {
      const slugExists = await this.categoryRepository.slugExists(
        updateDto.slug,
        category.organizationId,
        id,
      );
      if (slugExists) {
        throw new ConflictException(`Category with slug '${updateDto.slug}' already exists`);
      }
    }

    try {
      Object.assign(category, {
        ...updateDto,
        updatedBy: updatedBy || null,
      });

      const saved = await this.categoryRepository.save(category);
      return KnowledgeCategoryResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update category: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category not found: ${id}`);
    }

    // Check if category has articles
    const articleCount = await this.articleRepository.count({
      where: { categoryId: id },
    });
    if (articleCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${articleCount} articles. Please move or delete articles first.`,
      );
    }

    // Soft delete
    category.isActive = false;
    await this.categoryRepository.save(category);
  }

  /**
   * Get categories
   */
  async getCategories(organizationId?: number | null): Promise<KnowledgeCategoryResponseDto[]> {
    const categories = await this.categoryRepository.findByOrganization(organizationId || null);
    return categories.map((c) => KnowledgeCategoryResponseDto.fromEntity(c));
  }

  /**
   * Get root categories
   */
  async getRootCategories(organizationId?: number): Promise<KnowledgeCategoryResponseDto[]> {
    const categories = await this.categoryRepository.findRootCategories(organizationId);
    return categories.map((c) => KnowledgeCategoryResponseDto.fromEntity(c));
  }
}
