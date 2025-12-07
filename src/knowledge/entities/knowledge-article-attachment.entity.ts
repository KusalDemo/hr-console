import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { KnowledgeArticle } from './knowledge-article.entity';

/**
 * Knowledge Article Attachment Entity
 *
 * File attachments for knowledge articles
 */
@Entity('knowledge_article_attachments')
@Index('idx_knowledge_article_attachments_article', ['articleId'])
export class KnowledgeArticleAttachment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Article this attachment belongs to
   */
  @ManyToOne(() => KnowledgeArticle, (article) => article.attachments, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'article_id' })
  article: Promise<KnowledgeArticle> | KnowledgeArticle;

  @Column({ name: 'article_id', type: 'bigint', nullable: false })
  articleId: number;

  /**
   * Attachment name
   */
  @Column({ name: 'attachment_name', type: 'varchar', length: 255, nullable: false })
  attachmentName: string;

  /**
   * Attachment type (MIME type)
   */
  @Column({ name: 'attachment_type', type: 'varchar', length: 64, nullable: true })
  attachmentType: string | null;

  /**
   * File path/URL
   */
  @Column({ name: 'file_path', type: 'varchar', length: 512, nullable: false })
  filePath: string;

  /**
   * File size in bytes
   */
  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  /**
   * File hash for deduplication
   */
  @Column({ name: 'file_hash', type: 'varchar', length: 64, nullable: true })
  fileHash: string | null;

  /**
   * Display order
   */
  @Column({ name: 'display_order', type: 'integer', nullable: false, default: 0 })
  displayOrder: number;

  /**
   * Whether attachment is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz', nullable: false })
  uploadedAt: Date;

  @Column({ name: 'uploaded_by', type: 'bigint', nullable: true })
  uploadedBy: number | null;
}
