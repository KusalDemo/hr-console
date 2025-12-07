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
import { Employee } from '../../employees/entities/employee.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { DocumentVersion } from './document-version.entity';
import { DocumentShare } from './document-share.entity';

/**
 * Document Type Enum
 */
export enum DocumentType {
  FILE = 'FILE',
  FOLDER = 'FOLDER',
  LINK = 'LINK',
  TEMPLATE = 'TEMPLATE',
}

/**
 * Document Status Enum
 */
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

/**
 * Storage Provider Enum
 */
export enum StorageProvider {
  LOCAL = 'LOCAL',
  S3 = 'S3',
  GCS = 'GCS',
  AZURE = 'AZURE',
}

/**
 * Document Entity
 * 
 * Manages document metadata with:
 * - File storage paths and metadata
 * - Versioning support
 * - Sharing and permissions
 * - Document lifecycle
 * - Categories and tagging
 */
@Entity('documents')
@Index('idx_documents_key', ['documentKey'], { unique: true })
@Index('idx_documents_type', ['documentType'])
@Index('idx_documents_status', ['documentStatus'])
@Index('idx_documents_owner', ['ownerId'])
@Index('idx_documents_entity', ['entityType', 'entityId'])
@Index('idx_documents_category', ['documentCategory'])
@Index('idx_documents_parent', ['parentDocumentId'])
@Index('idx_documents_template', ['templateId'])
export class Document {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique document key
   */
  @Column({ name: 'document_key', type: 'varchar', length: 128, unique: true, nullable: false })
  documentKey: string;

  /**
   * Document name/title
   */
  @Column({ name: 'document_name', type: 'varchar', length: 255, nullable: false })
  documentName: string;

  /**
   * Document type
   */
  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  documentType: DocumentType;

  /**
   * Document category
   */
  @Column({ name: 'document_category', type: 'varchar', length: 128, nullable: true })
  documentCategory: string | null;

  /**
   * Original file name
   */
  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: false })
  fileName: string;

  /**
   * Storage path/URL
   */
  @Column({ name: 'file_path', type: 'varchar', length: 512, nullable: false })
  filePath: string;

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
   * File hash (SHA-256) for deduplication
   */
  @Column({ name: 'file_hash', type: 'varchar', length: 64, nullable: true })
  fileHash: string | null;

  /**
   * File extension
   */
  @Column({ name: 'file_extension', type: 'varchar', length: 32, nullable: true })
  fileExtension: string | null;

  /**
   * Current version number
   */
  @Column({ name: 'current_version', type: 'integer', nullable: false, default: 1 })
  currentVersion: number;

  /**
   * Total number of versions
   */
  @Column({ name: 'version_count', type: 'integer', nullable: false, default: 1 })
  versionCount: number;

  /**
   * Whether this is the latest version
   */
  @Column({ name: 'is_latest_version', type: 'boolean', nullable: false, default: true })
  isLatestVersion: boolean;

  /**
   * Parent document (for folders/hierarchy)
   */
  @ManyToOne(() => Document, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'parent_document_id' })
  parentDocument: Promise<Document | null> | Document | null;

  @Column({ name: 'parent_document_id', type: 'bigint', nullable: true })
  parentDocumentId: number | null;

  /**
   * Folder path (e.g., "/documents/2024/contracts")
   */
  @Column({ name: 'folder_path', type: 'varchar', length: 1024, nullable: true })
  folderPath: string | null;

  /**
   * Document description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Document content (for text documents)
   */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /**
   * Auto-generated summary (for search)
   */
  @Column({ name: 'content_summary', type: 'text', nullable: true })
  contentSummary: string | null;

  /**
   * Tags (JSON array)
   */
  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  /**
   * Labels (JSON array)
   */
  @Column({ type: 'jsonb', nullable: true })
  labels: string[] | null;

  /**
   * Custom field values (JSON)
   */
  @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
  customFields: Record<string, any> | null;

  /**
   * Document status
   */
  @Column({
    name: 'document_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: DocumentStatus.DRAFT,
  })
  documentStatus: DocumentStatus;

  /**
   * Current stage in lifecycle
   */
  @Column({ name: 'document_stage', type: 'varchar', length: 32, nullable: true })
  documentStage: string | null;

  /**
   * Document owner
   */
  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'RESTRICT',
    lazy: true,
  })
  @JoinColumn({ name: 'owner_id' })
  owner: Promise<Employee> | Employee;

  @Column({ name: 'owner_id', type: 'bigint', nullable: false })
  ownerId: number;

  /**
   * Organization context
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
   * Whether document is public
   */
  @Column({ name: 'is_public', type: 'boolean', nullable: false, default: false })
  isPublic: boolean;

  /**
   * Whether document is shared
   */
  @Column({ name: 'is_shared', type: 'boolean', nullable: false, default: false })
  isShared: boolean;

  /**
   * Whether sharing is enabled
   */
  @Column({ name: 'sharing_enabled', type: 'boolean', nullable: false, default: true })
  sharingEnabled: boolean;

  /**
   * Access control rules (JSON)
   */
  @Column({ name: 'access_control', type: 'jsonb', nullable: true })
  accessControl: Record<string, any> | null;

  /**
   * Template this document is based on
   */
  @ManyToOne(() => Document, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'template_id' })
  template: Promise<Document | null> | Document | null;

  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Related entity type (e.g., "PROJECT", "EMPLOYEE", "INVOICE")
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: true })
  entityType: string | null;

  /**
   * Related entity ID
   */
  @Column({ name: 'entity_id', type: 'bigint', nullable: true })
  entityId: number | null;

  /**
   * Storage provider
   */
  @Column({
    name: 'storage_provider',
    type: 'varchar',
    length: 64,
    nullable: false,
    default: StorageProvider.LOCAL,
  })
  storageProvider: StorageProvider;

  /**
   * Storage location/bucket
   */
  @Column({ name: 'storage_location', type: 'varchar', length: 512, nullable: true })
  storageLocation: string | null;

  /**
   * Storage-specific metadata (JSON)
   */
  @Column({ name: 'storage_metadata', type: 'jsonb', nullable: true })
  storageMetadata: Record<string, any> | null;

  /**
   * Whether document is encrypted
   */
  @Column({ name: 'is_encrypted', type: 'boolean', nullable: false, default: false })
  isEncrypted: boolean;

  /**
   * Encryption key identifier
   */
  @Column({ name: 'encryption_key_id', type: 'varchar', length: 128, nullable: true })
  encryptionKeyId: string | null;

  /**
   * Whether document is password protected
   */
  @Column({ name: 'is_password_protected', type: 'boolean', nullable: false, default: false })
  isPasswordProtected: boolean;

  /**
   * Whether document is indexed for search
   */
  @Column({ name: 'is_indexed', type: 'boolean', nullable: false, default: true })
  isIndexed: boolean;

  /**
   * Document versions
   */
  @OneToMany(() => DocumentVersion, (version) => version.document, {
    cascade: false,
    lazy: true,
  })
  versions: Promise<DocumentVersion[]> | DocumentVersion[];

  /**
   * Document shares
   */
  @OneToMany(() => DocumentShare, (share) => share.document, {
    cascade: false,
    lazy: true,
  })
  shares: Promise<DocumentShare[]> | DocumentShare[];

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: false })
  createdBy: number;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if document is a folder
   */
  isFolder(): boolean {
    return this.documentType === DocumentType.FOLDER;
  }

  /**
   * Check if document is a template
   */
  isTemplate(): boolean {
    return this.documentType === DocumentType.TEMPLATE;
  }

  /**
   * Check if document is archived
   */
  isArchived(): boolean {
    return this.documentStatus === DocumentStatus.ARCHIVED;
  }

  /**
   * Check if document is deleted
   */
  isDeleted(): boolean {
    return this.documentStatus === DocumentStatus.DELETED;
  }
}
