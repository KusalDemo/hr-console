import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  DocumentRepository,
  DocumentVersionRepository,
  DocumentShareRepository,
} from '../repositories';
import {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentVersion,
  DocumentShare,
  SharePermission,
  StorageProvider,
} from '../entities';
import { DocumentStorageService } from './document-storage.service';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  ShareDocumentDto,
  DocumentResponseDto,
  DocumentVersionResponseDto,
  DocumentShareResponseDto,
} from '../dto';

/**
 * Document Service
 *
 * Manages document operations:
 * - Document CRUD
 * - Version management
 * - Sharing and permissions
 * - Document lifecycle
 * - File operations
 */
@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly versionRepository: DocumentVersionRepository,
    private readonly shareRepository: DocumentShareRepository,
    private readonly storageService: DocumentStorageService,
    private readonly employeeRepository: EmployeeRepository,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== Document CRUD ====================

  /**
   * Create document
   */
  async createDocument(
    createDto: CreateDocumentDto,
    file: Express.Multer.File | null,
    createdBy: number,
  ): Promise<DocumentResponseDto> {
    // Validate owner
    const owner = await this.employeeRepository.findById(createDto.ownerId);
    if (!owner) {
      throw new NotFoundException(`Owner not found: ${createDto.ownerId}`);
    }

    // Generate document key
    const documentKey = this.storageService.generateDocumentKey();

    // Store file if provided
    let filePath = '';
    let fileSize = 0;
    let fileHash: string | null = null;
    let mimeType: string | null = null;
    let fileExtension: string | null = null;

    if (file && createDto.documentType === DocumentType.FILE) {
      const stored = await this.storageService.storeFile(
        file,
        documentKey,
        createDto.storageProvider || StorageProvider.LOCAL,
      );
      filePath = stored.filePath;
      fileSize = stored.fileSize;
      fileHash = stored.fileHash;
      mimeType = stored.mimeType;
      fileExtension = stored.fileExtension;
    } else if (createDto.documentType === DocumentType.FOLDER) {
      // Folders don't have files
      filePath = '';
    } else if (createDto.documentType === DocumentType.LINK) {
      // Links use the URL as file path
      filePath = createDto.linkUrl || '';
    }

    // Create document
    const document = this.documentRepository.create({
      documentKey,
      documentName: createDto.documentName,
      documentType: createDto.documentType,
      documentCategory: createDto.documentCategory || null,
      fileName: file?.originalname || createDto.documentName,
      filePath,
      fileSize,
      fileHash,
      mimeType,
      fileExtension,
      folderPath: createDto.folderPath || null,
      description: createDto.description || null,
      content: createDto.content || null,
      tags: createDto.tags || null,
      labels: createDto.labels || null,
      customFields: createDto.customFields || null,
      documentStatus: createDto.documentStatus || DocumentStatus.DRAFT,
      documentStage: createDto.documentStage || null,
      ownerId: createDto.ownerId,
      organizationId: createDto.organizationId || null,
      parentDocumentId: createDto.parentDocumentId || null,
      templateId: createDto.templateId || null,
      entityType: createDto.entityType || null,
      entityId: createDto.entityId || null,
      storageProvider: createDto.storageProvider || StorageProvider.LOCAL,
      storageLocation: createDto.storageLocation || null,
      storageMetadata: createDto.storageMetadata || null,
      isPublic: createDto.isPublic || false,
      sharingEnabled: createDto.sharingEnabled !== false,
      createdBy,
    });

    const saved = await this.documentRepository.save(document);

    // Create initial version
    if (file && createDto.documentType === DocumentType.FILE) {
      await this.createVersion(saved.id, file, 'Initial version', createdBy);
    }

    this.logger.log(`Created document: ${saved.documentKey}`);

    return DocumentResponseDto.fromEntity(saved);
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: number, userId?: number): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    // Check access
    if (userId && !(await this.hasAccess(document, userId))) {
      throw new ForbiddenException('Access denied to document');
    }

    return DocumentResponseDto.fromEntity(document);
  }

  /**
   * Get document by key
   */
  async getDocumentByKey(documentKey: string, userId?: number): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findByKey(documentKey);
    if (!document) {
      throw new NotFoundException(`Document not found: ${documentKey}`);
    }

    // Check access
    if (userId && !(await this.hasAccess(document, userId))) {
      throw new ForbiddenException('Access denied to document');
    }

    return DocumentResponseDto.fromEntity(document);
  }

  /**
   * Update document
   */
  async updateDocument(
    id: number,
    updateDto: UpdateDocumentDto,
    updatedBy: number,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    // Check permission
    if (document.ownerId !== updatedBy) {
      throw new ForbiddenException('Only document owner can update');
    }

    Object.assign(document, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.documentRepository.save(document);
    this.logger.log(`Updated document: ${saved.documentKey}`);

    return DocumentResponseDto.fromEntity(saved);
  }

  /**
   * Delete document
   */
  async deleteDocument(id: number, deletedBy: number): Promise<void> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    // Check permission
    if (document.ownerId !== deletedBy) {
      throw new ForbiddenException('Only document owner can delete');
    }

    // Soft delete - mark as deleted
    document.documentStatus = DocumentStatus.DELETED;
    document.updatedBy = deletedBy;
    await this.documentRepository.save(document);

    // Optionally delete file from storage
    // await this.storageService.deleteFile(document);

    this.logger.log(`Deleted document: ${document.documentKey}`);
  }

  /**
   * Get documents by owner
   */
  async getDocumentsByOwner(ownerId: number): Promise<DocumentResponseDto[]> {
    const documents = await this.documentRepository.findByOwner(ownerId);
    return documents.map((d) => DocumentResponseDto.fromEntity(d));
  }

  /**
   * Get shared documents for user
   */
  async getSharedDocuments(userId: number): Promise<DocumentResponseDto[]> {
    const documents = await this.documentRepository.findSharedForUser(userId);
    return documents.map((d) => DocumentResponseDto.fromEntity(d));
  }

  // ==================== Version Management ====================

  /**
   * Create new version
   */
  async createVersion(
    documentId: number,
    file: Express.Multer.File,
    changeDescription: string,
    createdBy: number,
  ): Promise<DocumentVersionResponseDto> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    // Get next version number
    const latestVersion = await this.versionRepository.getLatestVersionNumber(documentId);
    const newVersionNumber = latestVersion + 1;

    // Store new version file
    const stored = await this.storageService.storeFile(
      file,
      `${document.documentKey}_v${newVersionNumber}`,
      document.storageProvider,
    );

    // Mark previous versions as not current
    await this.versionRepository.update({ documentId, isCurrent: true }, { isCurrent: false });

    // Create version record
    const version = this.versionRepository.create({
      documentId,
      versionNumber: newVersionNumber,
      filePath: stored.filePath,
      fileName: file.originalname,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      fileHash: stored.fileHash,
      changeDescription,
      isCurrent: true,
      createdBy,
    });

    const saved = await this.versionRepository.save(version);

    // Update document
    document.currentVersion = newVersionNumber;
    document.versionCount = newVersionNumber;
    document.filePath = stored.filePath;
    document.fileSize = stored.fileSize;
    document.fileHash = stored.fileHash;
    document.mimeType = stored.mimeType;
    document.updatedBy = createdBy;
    await this.documentRepository.save(document);

    return DocumentVersionResponseDto.fromEntity(saved);
  }

  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: number): Promise<DocumentVersionResponseDto[]> {
    const versions = await this.versionRepository.findByDocument(documentId);
    return versions.map((v) => DocumentVersionResponseDto.fromEntity(v));
  }

  /**
   * Get document version
   */
  async getDocumentVersion(
    documentId: number,
    versionNumber: number,
  ): Promise<DocumentVersionResponseDto> {
    const version = await this.versionRepository.findByDocumentAndVersion(
      documentId,
      versionNumber,
    );
    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found for document ${documentId}`);
    }
    return DocumentVersionResponseDto.fromEntity(version);
  }

  // ==================== Sharing ====================

  /**
   * Share document
   */
  async shareDocument(
    documentId: number,
    shareDto: ShareDocumentDto,
    createdBy: number,
  ): Promise<DocumentShareResponseDto> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    if (!document.sharingEnabled) {
      throw new BadRequestException('Sharing is disabled for this document');
    }

    // Generate share token
    const shareToken = this.generateShareToken();

    // Generate share link if public
    const shareLink = shareDto.isPublic
      ? `${process.env.FRONTEND_URL || ''}/documents/share/${shareToken}`
      : null;

    const share = this.shareRepository.create({
      documentId,
      sharedWithId: shareDto.sharedWithId || null,
      sharedWithRole: shareDto.sharedWithRole || null,
      permissions: shareDto.permissions || [SharePermission.VIEW],
      shareLink,
      shareToken,
      expiresAt: shareDto.expiresAt || null,
      sharePassword: shareDto.sharePassword || null,
      createdBy,
    });

    const saved = await this.shareRepository.save(share);

    // Update document sharing status
    document.isShared = true;
    await this.documentRepository.save(document);

    return DocumentShareResponseDto.fromEntity(saved);
  }

  /**
   * Get document shares
   */
  async getDocumentShares(documentId: number): Promise<DocumentShareResponseDto[]> {
    const shares = await this.shareRepository.findByDocument(documentId);
    return shares.map((s) => DocumentShareResponseDto.fromEntity(s));
  }

  /**
   * Revoke share
   */
  async revokeShare(shareId: number): Promise<void> {
    const share = await this.shareRepository.findOne({ where: { id: shareId } });
    if (!share) {
      throw new NotFoundException(`Share not found: ${shareId}`);
    }

    share.isActive = false;
    await this.shareRepository.save(share);
  }

  // ==================== Helper Methods ====================

  /**
   * Check if user has access to document
   */
  private async hasAccess(document: Document, userId: number): Promise<boolean> {
    // Owner always has access
    if (document.ownerId === userId) {
      return true;
    }

    // Public documents
    if (document.isPublic) {
      return true;
    }

    // Check shares
    const shares = await this.shareRepository.findByDocument(document.id);
    const userShare = shares.find((s) => s.sharedWithId === userId && s.isActive && !s.isExpired());
    if (userShare) {
      return true;
    }

    return false;
  }

  /**
   * Generate share token
   */
  private generateShareToken(): string {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${random}${timestamp}`;
  }
}
