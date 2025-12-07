import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Like } from 'typeorm';
import { Document, DocumentType, DocumentStatus } from '../entities';

@Injectable()
export class DocumentRepository extends Repository<Document> {
  constructor(private dataSource: DataSource) {
    super(Document, dataSource.createEntityManager());
  }

  /**
   * Find document by key
   */
  async findByKey(documentKey: string): Promise<Document | null> {
    return this.findOne({
      where: { documentKey },
    });
  }

  /**
   * Find documents by owner
   */
  async findByOwner(ownerId: number): Promise<Document[]> {
    return this.find({
      where: { ownerId, documentStatus: DocumentStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find documents by type
   */
  async findByType(documentType: DocumentType): Promise<Document[]> {
    return this.find({
      where: { documentType, documentStatus: DocumentStatus.PUBLISHED },
      order: { documentName: 'ASC' },
    });
  }

  /**
   * Find documents by category
   */
  async findByCategory(category: string): Promise<Document[]> {
    return this.find({
      where: { documentCategory: category, documentStatus: DocumentStatus.PUBLISHED },
      order: { documentName: 'ASC' },
    });
  }

  /**
   * Find documents by entity
   */
  async findByEntity(entityType: string, entityId: number): Promise<Document[]> {
    return this.find({
      where: { entityType, entityId, documentStatus: DocumentStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find documents in folder
   */
  async findByFolder(folderPath: string): Promise<Document[]> {
    return this.find({
      where: { folderPath, documentStatus: DocumentStatus.PUBLISHED },
      order: { documentName: 'ASC' },
    });
  }

  /**
   * Find documents by parent
   */
  async findByParent(parentDocumentId: number): Promise<Document[]> {
    return this.find({
      where: { parentDocumentId, documentStatus: DocumentStatus.PUBLISHED },
      order: { documentName: 'ASC' },
    });
  }

  /**
   * Find templates
   */
  async findTemplates(): Promise<Document[]> {
    return this.find({
      where: { documentType: DocumentType.TEMPLATE, documentStatus: DocumentStatus.PUBLISHED },
      order: { documentName: 'ASC' },
    });
  }

  /**
   * Search documents by name
   */
  async searchByName(searchTerm: string, limit: number = 50): Promise<Document[]> {
    return this.find({
      where: {
        documentName: Like(`%${searchTerm}%`),
        documentStatus: DocumentStatus.PUBLISHED,
      },
      take: limit,
      order: { documentName: 'ASC' },
    });
  }

  /**
   * Find documents by tags
   */
  async findByTags(tags: string[]): Promise<Document[]> {
    // PostgreSQL JSONB contains query
    const query = this.createQueryBuilder('document')
      .where('document.documentStatus = :status', { status: DocumentStatus.PUBLISHED })
      .andWhere('document.tags @> :tags', { tags: JSON.stringify(tags) })
      .orderBy('document.documentName', 'ASC');

    return query.getMany();
  }

  /**
   * Find shared documents for user
   */
  async findSharedForUser(userId: number): Promise<Document[]> {
    return this.createQueryBuilder('document')
      .innerJoin('document.shares', 'share')
      .where('share.sharedWithId = :userId', { userId })
      .andWhere('share.isActive = :active', { active: true })
      .andWhere('(share.expiresAt IS NULL OR share.expiresAt > :now)', { now: new Date() })
      .andWhere('document.documentStatus = :status', { status: DocumentStatus.PUBLISHED })
      .orderBy('document.documentName', 'ASC')
      .getMany();
  }
}
