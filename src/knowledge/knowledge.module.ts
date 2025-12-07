import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService, KnowledgeSearchService } from './services';
import {
  KnowledgeArticleRepository,
  KnowledgeCategoryRepository,
} from './repositories';
import {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeArticleVersion,
  KnowledgeArticleAttachment,
  KnowledgeArticleView,
  KnowledgeArticleFeedback,
} from './entities';
import { OrganizationsModule } from '../organizations/organizations.module';

/**
 * Knowledge Module
 * 
 * Provides knowledge base system:
 * - Article management with versioning
 * - Draft/published workflow with approval
 * - Full-text search using PostgreSQL
 * - Category management
 * - Article permissions and access control
 * - Analytics (views, helpful votes)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeArticle,
      KnowledgeCategory,
      KnowledgeArticleVersion,
      KnowledgeArticleAttachment,
      KnowledgeArticleView,
      KnowledgeArticleFeedback,
    ]),
    OrganizationsModule,
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeSearchService,
    KnowledgeArticleRepository,
    KnowledgeCategoryRepository,
  ],
  exports: [
    KnowledgeService,
    KnowledgeSearchService,
    KnowledgeArticleRepository,
    KnowledgeCategoryRepository,
  ],
})
export class KnowledgeModule {}
