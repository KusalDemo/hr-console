import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vendor } from './vendor.entity';

/**
 * Rating Category Enum
 */
export enum RatingCategory {
  QUALITY = 'QUALITY', // Quality of products/services
  DELIVERY = 'DELIVERY', // On-time delivery
  PRICE = 'PRICE', // Competitive pricing
  COMMUNICATION = 'COMMUNICATION', // Communication
  RESPONSIVENESS = 'RESPONSIVENESS', // Responsiveness
  OVERALL = 'OVERALL', // Overall rating
}

/**
 * Vendor Rating Entity
 * 
 * Performance tracking and ratings for vendors with multiple rating categories.
 */
@Entity('vendor_ratings')
@Index('idx_vendor_ratings_vendor', ['vendorId'])
@Index('idx_vendor_ratings_date', ['ratingDate'])
@Index('idx_vendor_ratings_category', ['ratingCategory'])
export class VendorRating {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to vendor
   */
  @Column({ name: 'vendor_id', type: 'bigint', nullable: false })
  vendorId: number;

  /**
   * Vendor relationship
   */
  @ManyToOne(() => Vendor, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  /**
   * Rating category
   */
  @Column({
    name: 'rating_category',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: RatingCategory.OVERALL,
  })
  ratingCategory: RatingCategory;

  /**
   * Rating value (1-5 scale)
   */
  @Column({ name: 'rating_value', type: 'integer', nullable: false })
  ratingValue: number; // 1-5

  /**
   * Rating date
   */
  @Column({ name: 'rating_date', type: 'date', nullable: false })
  ratingDate: Date;

  /**
   * Rated by (employee/user ID)
   */
  @Column({ name: 'rated_by', type: 'bigint', nullable: true })
  ratedBy: number | null;

  /**
   * Related purchase order ID (if rating is for a specific PO)
   */
  @Column({ name: 'related_po_id', type: 'bigint', nullable: true })
  relatedPoId: number | null;

  /**
   * Related project ID (if rating is for a specific project)
   */
  @Column({ name: 'related_project_id', type: 'bigint', nullable: true })
  relatedProjectId: number | null;

  /**
   * Comments
   */
  @Column({ type: 'text', nullable: true })
  comments: string | null;

  /**
   * Rating metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'rating_metadata', type: 'jsonb', nullable: true })
  ratingMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}

