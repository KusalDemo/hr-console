import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { KnowledgeCategory } from './knowledge-category.entity';
import { KnowledgeArticleVersion } from './knowledge-article-version.entity';
import { KnowledgeArticleAttachment } from './knowledge-article-attachment.entity';
import { KnowledgeArticleView } from './knowledge-article-view.entity';
import { KnowledgeArticleFeedback } from './knowledge-article-feedback.entity';

/**
 * Article Status Enum
 */
export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

/**
 * Knowledge Article Entity
 * 
 * Manages knowledge base articles with:
 * - Categories and tags
 * - Versioning support
 * - Draft/published workflow
 * - Approval process
 * - Full-text search
 * - Permissions and access control
 * - Analytics (views, helpful votes)
 */
@Entity('knowledge_articles')
@Index('idx_knowledge_articles_status', ['status'])
@Index('idx_knowledge_articles_category', ['categoryId'])
@Index('idx_knowledge_articles_organization', ['organizationId'])
@Index('idx_knowledge_articles_slug', ['slug'], { unique: true })
@Index('idx_knowledge_articles_created', ['createdAt'])
@Index('idx_knowledge_articles_published', ['status', 'publishedAt'])
export class KnowledgeArticle {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Article title
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  /**
   * URL-friendly slug
   */
  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  slug: string;

  /**
   * Article content (HTML or Markdown)
   */
  @Column({ type: 'text', nullable: false })
  content: string;

  /**
   * Article excerpt/summary
   */
  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  /**
   * Article status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  /**
   * Category this article belongs to
   */
  @ManyToOne(() => KnowledgeCategory, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: Promise<KnowledgeCategory | null> | KnowledgeCategory | null;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId: number | null;

  /**
   * Organization this article belongs to (null = global article)
   */
  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization | null> | Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Tags (JSON array)
   */
  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  /**
   * Article versions
   */
  @OneToMany(() => KnowledgeArticleVersion, (version) => version.article, {
    cascade: false,
    lazy: true,
  })
  versions: Promise<KnowledgeArticleVersion[]> | KnowledgeArticleVersion[];

  /**
   * Current version number
   */
  @Column({ name: 'current_version', type: 'integer', nullable: false, default: 1 })
  currentVersion: number;

  /**
   * Article attachments
   */
  @OneToMany(() => KnowledgeArticleAttachment, (attachment) => attachment.article, {
    cascade: false,
    lazy: true,
  })
  attachments: Promise<KnowledgeArticleAttachment[]> | KnowledgeArticleAttachment[];

  /**
   * Article views
   */
  @OneToMany(() => KnowledgeArticleView, (view) => view.article, {
    cascade: false,
    lazy: true,
  })
  views: Promise<KnowledgeArticleView[]> | KnowledgeArticleView[];

  /**
   * Article feedback
   */
  @OneToMany(() => KnowledgeArticleFeedback, (feedback) => feedback.article, {
    cascade: false,
    lazy: true,
  })
  feedback: Promise<KnowledgeArticleFeedback[]> | KnowledgeArticleFeedback[];

  /**
   * View count
   */
  @Column({ name: 'view_count', type: 'integer', nullable: false, default: 0 })
  viewCount: number;

  /**
   * Helpful vote count
   */
  @Column({ name: 'helpful_count', type: 'integer', nullable: false, default: 0 })
  helpfulCount: number;

  /**
   * Not helpful vote count
   */
  @Column({ name: 'not_helpful_count', type: 'integer', nullable: false, default: 0 })
  notHelpfulCount: number;

  /**
   * Published at timestamp
   */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /**
   * Published by user ID
   */
  @Column({ name: 'published_by', type: 'bigint', nullable: true })
  publishedBy: number | null;

  /**
   * Approved at timestamp
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * Approved by user ID
   */
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: number | null;

  /**
   * Permissions (JSON)
   * Format: { view: ['ADMIN', 'HR'], edit: ['ADMIN'], publish: ['ADMIN'] }
   */
  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, string[]> | null;

  /**
   * Whether article is featured
   */
  @Column({ name: 'is_featured', type: 'boolean', nullable: false, default: false })
  isFeatured: boolean;

  /**
   * Whether article allows comments/feedback
   */
  @Column({ name: 'allows_feedback', type: 'boolean', nullable: false, default: true })
  allowsFeedback: boolean;

  /**
   * SEO metadata (JSON)
   */
  @Column({ name: 'seo_metadata', type: 'jsonb', nullable: true })
  seoMetadata: Record<string, any> | null;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if article is published
   */
  isPublished(): boolean {
    return this.status === ArticleStatus.PUBLISHED && this.publishedAt !== null;
  }

  /**
   * Check if article is draft
   */
  isDraft(): boolean {
    return this.status === ArticleStatus.DRAFT;
  }

  /**
   * Check if article needs approval
   */
  needsApproval(): boolean {
    return this.status === ArticleStatus.PENDING_REVIEW;
  }
}
