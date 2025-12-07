import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { KnowledgeService, KnowledgeSearchService } from './services';
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
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ArticleStatus } from './entities/knowledge-article.entity';
import { FeedbackType } from './entities/knowledge-article-feedback.entity';

/**
 * Knowledge Controller
 *
 * REST API endpoints for knowledge base:
 * - Article CRUD
 * - Article workflow (submit, approve, publish)
 * - Category management
 * - Search functionality
 * - Analytics tracking
 */
@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly searchService: KnowledgeSearchService,
  ) {}

  // ==================== Article Endpoints ====================

  /**
   * Create article
   * POST /knowledge/articles
   */
  @Post('articles')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createArticle(
    @Body() createDto: CreateKnowledgeArticleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KnowledgeArticleResponseDto> {
    return this.knowledgeService.createArticle(createDto, user.userId);
  }

  /**
   * Get article by ID
   * GET /knowledge/articles/:id
   */
  @Get('articles/:id')
  async getArticle(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @CurrentUser() user?: JwtPayload,
  ): Promise<KnowledgeArticleResponseDto> {
    const article = await this.knowledgeService.getArticleById(id);

    // Track view (async, don't wait)
    this.knowledgeService
      .trackView(id, user?.userId, req.ip, req.get('user-agent'))
      .catch((error) => {
        console.error('Failed to track view:', error);
      });

    return article;
  }

  /**
   * Get article by slug
   * GET /knowledge/articles/slug/:slug
   */
  @Get('articles/slug/:slug')
  async getArticleBySlug(
    @Param('slug') slug: string,
    @Req() req: Request,
    @CurrentUser() user?: JwtPayload,
  ): Promise<KnowledgeArticleResponseDto> {
    const article = await this.knowledgeService.getArticleBySlug(slug);

    // Track view (async, don't wait)
    this.knowledgeService
      .trackView(article.id, user?.userId, req.ip, req.get('user-agent'))
      .catch((error) => {
        console.error('Failed to track view:', error);
      });

    return article;
  }

  /**
   * Get articles with pagination
   * GET /knowledge/articles?page=1&limit=20&status=PUBLISHED
   */
  @Get('articles')
  async getArticles(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: ArticleStatus,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('tags') tags?: string,
    @Query('isFeatured', new ParseIntPipe({ optional: true })) isFeatured?: boolean,
    @Query('searchTerm') searchTerm?: string,
  ): Promise<{ articles: KnowledgeArticleResponseDto[]; total: number }> {
    return this.knowledgeService.getArticles(page || 1, limit || 20, {
      status,
      categoryId,
      organizationId,
      tags: tags ? tags.split(',') : undefined,
      isFeatured,
      searchTerm,
    });
  }

  /**
   * Get published articles
   * GET /knowledge/articles/published
   */
  @Get('articles/published')
  async getPublishedArticles(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<KnowledgeArticleResponseDto[]> {
    return this.knowledgeService.getPublishedArticles(organizationId, categoryId, limit);
  }

  /**
   * Get featured articles
   * GET /knowledge/articles/featured
   */
  @Get('articles/featured')
  async getFeaturedArticles(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<KnowledgeArticleResponseDto[]> {
    return this.knowledgeService.getFeaturedArticles(organizationId, limit || 10);
  }

  /**
   * Update article
   * PUT /knowledge/articles/:id
   */
  @Put('articles/:id')
  @Roles('ADMIN', 'HR')
  async updateArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateKnowledgeArticleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KnowledgeArticleResponseDto> {
    return this.knowledgeService.updateArticle(id, updateDto, user.userId);
  }

  /**
   * Delete article
   * DELETE /knowledge/articles/:id
   */
  @Delete('articles/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArticle(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.knowledgeService.deleteArticle(id);
  }

  /**
   * Submit article for review
   * POST /knowledge/articles/:id/submit
   */
  @Post('articles/:id/submit')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.OK)
  async submitForReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitDto: SubmitArticleForReviewDto,
  ): Promise<KnowledgeArticleResponseDto> {
    return this.knowledgeService.submitForReview(id, submitDto);
  }

  /**
   * Approve article
   * POST /knowledge/articles/:id/approve
   */
  @Post('articles/:id/approve')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.OK)
  async approveArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveArticleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KnowledgeArticleResponseDto> {
    return this.knowledgeService.approveArticle(id, approveDto, user.userId);
  }

  /**
   * Publish article
   * POST /knowledge/articles/:id/publish
   */
  @Post('articles/:id/publish')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.OK)
  async publishArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() publishDto: PublishArticleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KnowledgeArticleResponseDto> {
    return this.knowledgeService.publishArticle(id, publishDto, user.userId);
  }

  /**
   * Submit article feedback
   * POST /knowledge/articles/:id/feedback
   */
  @Post('articles/:id/feedback')
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { feedbackType: FeedbackType; comment?: string },
    @Req() req: Request,
    @CurrentUser() user?: JwtPayload,
  ): Promise<{ message: string }> {
    await this.knowledgeService.submitFeedback(
      id,
      body.feedbackType,
      user?.userId,
      body.comment,
      req.ip,
    );
    return { message: 'Feedback submitted successfully' };
  }

  /**
   * Search articles
   * GET /knowledge/articles/search?q=query
   */
  @Get('articles/search')
  async searchArticles(
    @Query('q') searchTerm: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ articles: KnowledgeArticleResponseDto[]; total: number }> {
    const result = await this.searchService.searchArticles(
      searchTerm,
      organizationId,
      categoryId,
      limit || 20,
      ((page || 1) - 1) * (limit || 20),
    );
    return {
      articles: result.articles.map((a) => KnowledgeArticleResponseDto.fromEntity(a)),
      total: result.total,
    };
  }

  /**
   * Get article statistics
   * GET /knowledge/articles/statistics?organizationId=1
   */
  @Get('articles/statistics')
  @Roles('ADMIN', 'HR')
  async getArticleStatistics(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<{
    total: number;
    published: number;
    draft: number;
    pendingReview: number;
    byCategory: Record<string, number>;
  }> {
    return this.knowledgeService.getArticleStatistics(organizationId);
  }

  // ==================== Category Endpoints ====================

  /**
   * Create category
   * POST /knowledge/categories
   */
  @Post('categories')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() createDto: CreateKnowledgeCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KnowledgeCategoryResponseDto> {
    return this.knowledgeService.createCategory(createDto, user.userId);
  }

  /**
   * Get category by ID
   * GET /knowledge/categories/:id
   */
  @Get('categories/:id')
  async getCategory(@Param('id', ParseIntPipe) id: number): Promise<KnowledgeCategoryResponseDto> {
    return this.knowledgeService.getCategoryById(id);
  }

  /**
   * Get categories
   * GET /knowledge/categories?organizationId=1
   */
  @Get('categories')
  async getCategories(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<KnowledgeCategoryResponseDto[]> {
    return this.knowledgeService.getCategories(organizationId);
  }

  /**
   * Get root categories
   * GET /knowledge/categories/root
   */
  @Get('categories/root')
  async getRootCategories(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<KnowledgeCategoryResponseDto[]> {
    return this.knowledgeService.getRootCategories(organizationId);
  }

  /**
   * Update category
   * PUT /knowledge/categories/:id
   */
  @Put('categories/:id')
  @Roles('ADMIN', 'HR')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateKnowledgeCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KnowledgeCategoryResponseDto> {
    return this.knowledgeService.updateCategory(id, updateDto, user.userId);
  }

  /**
   * Delete category
   * DELETE /knowledge/categories/:id
   */
  @Delete('categories/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.knowledgeService.deleteCategory(id);
  }
}
