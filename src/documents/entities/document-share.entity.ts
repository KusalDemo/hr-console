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
import { Document } from './document.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Share Permission Enum
 */
export enum SharePermission {
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  SHARE = 'SHARE',
}

/**
 * Document Share Entity
 *
 * Manages document sharing and permissions:
 * - Shared with users/roles
 * - Permission levels
 * - Expiration dates
 * - Access tracking
 */
@Entity('document_shares')
@Index('idx_document_shares_document', ['documentId'])
@Index('idx_document_shares_user', ['sharedWithId'])
@Index('idx_document_shares_active', ['isActive'])
export class DocumentShare {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Document being shared
   */
  @ManyToOne(() => Document, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'document_id' })
  document: Promise<Document> | Document;

  @Column({ name: 'document_id', type: 'bigint', nullable: false })
  documentId: number;

  /**
   * Shared with user
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'shared_with_id' })
  sharedWith: Promise<Employee | null> | Employee | null;

  @Column({ name: 'shared_with_id', type: 'bigint', nullable: true })
  sharedWithId: number | null;

  /**
   * Shared with role (if shared with role instead of user)
   */
  @Column({ name: 'shared_with_role', type: 'varchar', length: 64, nullable: true })
  sharedWithRole: string | null;

  /**
   * Permissions (JSON array of SharePermission)
   */
  @Column({ type: 'jsonb', nullable: false })
  permissions: SharePermission[];

  /**
   * Share link (for public shares)
   */
  @Column({ name: 'share_link', type: 'varchar', length: 512, nullable: true })
  shareLink: string | null;

  /**
   * Share token (for secure access)
   */
  @Column({ name: 'share_token', type: 'varchar', length: 128, nullable: true })
  shareToken: string | null;

  /**
   * Expires at
   */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  /**
   * Whether share is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Password for share (hashed)
   */
  @Column({ name: 'share_password', type: 'varchar', length: 255, nullable: true })
  sharePassword: string | null;

  /**
   * Access count
   */
  @Column({ name: 'access_count', type: 'integer', nullable: false, default: 0 })
  accessCount: number;

  /**
   * Last accessed at
   */
  @Column({ name: 'last_accessed_at', type: 'timestamptz', nullable: true })
  lastAccessedAt: Date | null;

  /**
   * Share metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: false })
  createdBy: number;

  /**
   * Check if share is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: SharePermission): boolean {
    return this.permissions.includes(permission);
  }
}
