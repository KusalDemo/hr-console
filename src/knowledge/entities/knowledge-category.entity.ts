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
import { KnowledgeArticle } from './knowledge-article.entity';

/**
 * Knowledge Category Entity
 * 
 * Categories for organizing knowledge articles
 */
@Entity('knowledge_categories')
@Index('idx_knowledge_categories_parent', ['parentId'])
@Index('idx_knowledge_categories_organization', ['organizationId'])
@Index('idx_knowledge_categories_slug', ['slug'])
export class KnowledgeCategory {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Category name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * URL-friendly slug
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  slug: string;

  /**
   * Category description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Parent category (for hierarchical structure)
   */
  @ManyToOne(() => KnowledgeCategory, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Promise<KnowledgeCategory | null> | KnowledgeCategory | null;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: number | null;

  /**
   * Child categories
   */
  @OneToMany(() => KnowledgeCategory, (category) => category.parent, {
    cascade: false,
    lazy: true,
  })
  children: Promise<KnowledgeCategory[]> | KnowledgeCategory[];

  /**
   * Articles in this category
   */
  @OneToMany(() => KnowledgeArticle, (article) => article.category, {
    cascade: false,
    lazy: true,
  })
  articles: Promise<KnowledgeArticle[]> | KnowledgeArticle[];

  /**
   * Organization this category belongs to (null = global category)
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
   * Display order
   */
  @Column({ name: 'display_order', type: 'integer', nullable: false, default: 0 })
  displayOrder: number;

  /**
   * Whether category is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Icon or image URL
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  icon: string | null;

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
}
