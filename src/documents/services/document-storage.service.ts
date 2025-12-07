import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { Document, StorageProvider } from '../entities';

/**
 * Document Storage Service
 *
 * Handles file storage operations:
 * - Local file storage
 * - Cloud storage integration (S3, GCS, Azure) - structure for future
 * - File hash calculation
 * - File metadata extraction
 */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    // Get upload directory from environment or use default
    this.uploadDir = process.env.DOCUMENT_UPLOAD_DIR || './uploads/documents';
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Document upload directory: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(
        `Failed to create upload directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Store file
   */
  async storeFile(
    file: Express.Multer.File,
    documentKey: string,
    storageProvider: StorageProvider = StorageProvider.LOCAL,
  ): Promise<{
    filePath: string;
    fileSize: number;
    fileHash: string;
    mimeType: string;
    fileExtension: string;
  }> {
    switch (storageProvider) {
      case StorageProvider.LOCAL:
        return this.storeFileLocal(file, documentKey);
      case StorageProvider.S3:
        // TODO: Implement S3 storage
        throw new Error('S3 storage not yet implemented');
      case StorageProvider.GCS:
        // TODO: Implement GCS storage
        throw new Error('GCS storage not yet implemented');
      case StorageProvider.AZURE:
        // TODO: Implement Azure storage
        throw new Error('Azure storage not yet implemented');
      default:
        throw new Error(`Unsupported storage provider: ${storageProvider}`);
    }
  }

  /**
   * Store file locally
   */
  private async storeFileLocal(
    file: Express.Multer.File,
    documentKey: string,
  ): Promise<{
    filePath: string;
    fileSize: number;
    fileHash: string;
    mimeType: string;
    fileExtension: string;
  }> {
    // Generate file hash
    const fileHash = this.calculateFileHash(file.buffer);

    // Get file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();

    // Generate storage path (organize by date)
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePath = `${year}/${month}/${day}`;

    const storageDir = path.join(this.uploadDir, datePath);
    await fs.mkdir(storageDir, { recursive: true });

    // Generate unique filename
    const fileName = `${documentKey}${fileExtension}`;
    const filePath = path.join(storageDir, fileName);

    // Write file
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`File stored: ${filePath}`);

    return {
      filePath: path.relative(this.uploadDir, filePath),
      fileSize: file.size,
      fileHash,
      mimeType: file.mimetype,
      fileExtension,
    };
  }

  /**
   * Get file content
   */
  async getFileContent(document: Document): Promise<Buffer> {
    switch (document.storageProvider) {
      case StorageProvider.LOCAL:
        return this.getFileContentLocal(document);
      case StorageProvider.S3:
        // TODO: Implement S3 retrieval
        throw new Error('S3 storage not yet implemented');
      case StorageProvider.GCS:
        // TODO: Implement GCS retrieval
        throw new Error('GCS storage not yet implemented');
      case StorageProvider.AZURE:
        // TODO: Implement Azure retrieval
        throw new Error('Azure storage not yet implemented');
      default:
        throw new Error(`Unsupported storage provider: ${document.storageProvider}`);
    }
  }

  /**
   * Get file content from local storage
   */
  private async getFileContentLocal(document: Document): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, document.filePath);
    return fs.readFile(fullPath);
  }

  /**
   * Delete file
   */
  async deleteFile(document: Document): Promise<void> {
    switch (document.storageProvider) {
      case StorageProvider.LOCAL:
        return this.deleteFileLocal(document);
      case StorageProvider.S3:
        // TODO: Implement S3 deletion
        throw new Error('S3 storage not yet implemented');
      case StorageProvider.GCS:
        // TODO: Implement GCS deletion
        throw new Error('GCS storage not yet implemented');
      case StorageProvider.AZURE:
        // TODO: Implement Azure deletion
        throw new Error('Azure storage not yet implemented');
      default:
        throw new Error(`Unsupported storage provider: ${document.storageProvider}`);
    }
  }

  /**
   * Delete file from local storage
   */
  private async deleteFileLocal(document: Document): Promise<void> {
    const fullPath = path.join(this.uploadDir, document.filePath);
    try {
      await fs.unlink(fullPath);
      this.logger.log(`File deleted: ${fullPath}`);
    } catch (error) {
      // File might not exist, log but don't throw
      this.logger.warn(
        `Failed to delete file ${fullPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Calculate file hash (SHA-256)
   */
  private calculateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate document key
   */
  generateDocumentKey(prefix: string = 'doc'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}_${random}`;
  }
}
