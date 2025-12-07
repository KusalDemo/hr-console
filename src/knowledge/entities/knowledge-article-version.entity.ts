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
 * Knowledge Article Version Entity
 *
 * Tracks version history of knowledge articles
 */
@Entity('knowledge_article_versions')
@Index('idx_knowledge_article_versions_article', ['articleId'])
@Index('idx_knowledge_article_versions_version', ['articleId', 'versionNumber'])
export class KnowledgeArticleVersion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Article this version belongs to
   */
  @ManyToOne(() => KnowledgeArticle, (article) => article.versions, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'article_id' })
  article: Promise<KnowledgeArticle> | KnowledgeArticle;

  @Column({ name: 'article_id', type: 'bigint', nullable: false })
  articleId: number;

  /**
   * Version number
   */
  @Column({ name: 'version_number', type: 'integer', nullable: false })
  versionNumber: number;

  /**
   * Article title at this version
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  /**
   * Article content at this version
   */
  @Column({ type: 'text', nullable: false })
  content: string;

  /**
   * Article excerpt at this version
   */
  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  /**
   * Change summary
   */
  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  /**
   * Whether this is the current version
   */
  @Column({ name: 'is_current', type: 'boolean', nullable: false, default: false })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;
}
