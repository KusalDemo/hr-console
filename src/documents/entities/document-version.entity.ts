import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Document Version Entity
 * 
 * Tracks document version history:
 * - Version numbers
 * - File changes
 * - Change descriptions
 * - Version metadata
 */
@Entity('document_versions')
@Index('idx_document_versions_document', ['documentId'])
@Index('idx_document_versions_version', ['documentId', 'versionNumber'])
export class DocumentVersion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Document this version belongs to
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
   * Version number
   */
  @Column({ name: 'version_number', type: 'integer', nullable: false })
  versionNumber: number;

  /**
   * File path for this version
   */
  @Column({ name: 'file_path', type: 'varchar', length: 512, nullable: false })
  filePath: string;

  /**
   * File name for this version
   */
  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: false })
  fileName: string;

  /**
   * File size in bytes
   */
  @Column({ name: 'file_size', type: 'bigint', nullable: false })
  fileSize: number;

  /**
   * MIME type
   */
  @Column({ name: 'mime_type', type: 'varchar', length: 128, nullable: true })
  mimeType: string | null;

  /**
   * File hash (SHA-256)
   */
  @Column({ name: 'file_hash', type: 'varchar', length: 64, nullable: true })
  fileHash: string | null;

  /**
   * Change description
   */
  @Column({ name: 'change_description', type: 'text', nullable: true })
  changeDescription: string | null;

  /**
   * Whether this is the current version
   */
  @Column({ name: 'is_current', type: 'boolean', nullable: false, default: false })
  isCurrent: boolean;

  /**
   * Created by user
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'created_by' })
  createdByUser: Promise<Employee | null> | Employee | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: false })
  createdBy: number;

  /**
   * Version metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}
