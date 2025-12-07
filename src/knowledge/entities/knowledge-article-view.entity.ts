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
 * Knowledge Article View Entity
 *
 * Tracks article views for analytics
 */
@Entity('knowledge_article_views')
@Index('idx_knowledge_article_views_article', ['articleId'])
@Index('idx_knowledge_article_views_user', ['userId'])
@Index('idx_knowledge_article_views_created', ['createdAt'])
export class KnowledgeArticleView {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Article that was viewed
   */
  @ManyToOne(() => KnowledgeArticle, (article) => article.views, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'article_id' })
  article: Promise<KnowledgeArticle> | KnowledgeArticle;

  @Column({ name: 'article_id', type: 'bigint', nullable: false })
  articleId: number;

  /**
   * User who viewed (null for anonymous views)
   */
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  /**
   * IP address
   */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /**
   * User agent
   */
  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}
