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
 * Feedback Type Enum
 */
export enum FeedbackType {
  HELPFUL = 'HELPFUL',
  NOT_HELPFUL = 'NOT_HELPFUL',
  COMMENT = 'COMMENT',
}

/**
 * Knowledge Article Feedback Entity
 * 
 * Tracks user feedback on articles (helpful votes, comments)
 */
@Entity('knowledge_article_feedback')
@Index('idx_knowledge_article_feedback_article', ['articleId'])
@Index('idx_knowledge_article_feedback_user', ['userId'])
@Index('idx_knowledge_article_feedback_type', ['feedbackType'])
export class KnowledgeArticleFeedback {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Article this feedback is for
   */
  @ManyToOne(() => KnowledgeArticle, (article) => article.feedback, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'article_id' })
  article: Promise<KnowledgeArticle> | KnowledgeArticle;

  @Column({ name: 'article_id', type: 'bigint', nullable: false })
  articleId: number;

  /**
   * User who provided feedback (null for anonymous)
   */
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  /**
   * Feedback type
   */
  @Column({
    name: 'feedback_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  feedbackType: FeedbackType;

  /**
   * Feedback comment
   */
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  /**
   * IP address
   */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}
