import { KnowledgeArticle } from '../entities/knowledge-article.entity';

/**
 * Knowledge Article Response DTO
 */
export class KnowledgeArticleResponseDto {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: string;
  categoryId: number | null;
  organizationId: number | null;
  tags: string[] | null;
  currentVersion: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  publishedAt: Date | null;
  publishedBy: number | null;
  approvedAt: Date | null;
  approvedBy: number | null;
  permissions: Record<string, string[]> | null;
  isFeatured: boolean;
  allowsFeedback: boolean;
  seoMetadata: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: KnowledgeArticle): KnowledgeArticleResponseDto {
    const dto = new KnowledgeArticleResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.slug = entity.slug;
    dto.content = entity.content;
    dto.excerpt = entity.excerpt;
    dto.status = entity.status;
    dto.categoryId = entity.categoryId;
    dto.organizationId = entity.organizationId;
    dto.tags = entity.tags;
    dto.currentVersion = entity.currentVersion;
    dto.viewCount = entity.viewCount;
    dto.helpfulCount = entity.helpfulCount;
    dto.notHelpfulCount = entity.notHelpfulCount;
    dto.publishedAt = entity.publishedAt;
    dto.publishedBy = entity.publishedBy;
    dto.approvedAt = entity.approvedAt;
    dto.approvedBy = entity.approvedBy;
    dto.permissions = entity.permissions;
    dto.isFeatured = entity.isFeatured;
    dto.allowsFeedback = entity.allowsFeedback;
    dto.seoMetadata = entity.seoMetadata;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
