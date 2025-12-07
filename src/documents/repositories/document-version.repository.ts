import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DocumentVersion } from '../entities';

@Injectable()
export class DocumentVersionRepository extends Repository<DocumentVersion> {
  constructor(private dataSource: DataSource) {
    super(DocumentVersion, dataSource.createEntityManager());
  }

  /**
   * Find versions for document
   */
  async findByDocument(documentId: number): Promise<DocumentVersion[]> {
    return this.find({
      where: { documentId },
      order: { versionNumber: 'DESC' },
    });
  }

  /**
   * Find version by document and version number
   */
  async findByDocumentAndVersion(
    documentId: number,
    versionNumber: number,
  ): Promise<DocumentVersion | null> {
    return this.findOne({
      where: { documentId, versionNumber },
    });
  }

  /**
   * Find current version for document
   */
  async findCurrentVersion(documentId: number): Promise<DocumentVersion | null> {
    return this.findOne({
      where: { documentId, isCurrent: true },
    });
  }

  /**
   * Get latest version number for document
   */
  async getLatestVersionNumber(documentId: number): Promise<number> {
    const latest = await this.findOne({
      where: { documentId },
      order: { versionNumber: 'DESC' },
    });

    return latest ? latest.versionNumber : 0;
  }
}
