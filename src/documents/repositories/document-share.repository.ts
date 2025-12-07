import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import { DocumentShare } from '../entities';

@Injectable()
export class DocumentShareRepository extends Repository<DocumentShare> {
  constructor(private dataSource: DataSource) {
    super(DocumentShare, dataSource.createEntityManager());
  }

  /**
   * Find shares for document
   */
  async findByDocument(documentId: number): Promise<DocumentShare[]> {
    return this.find({
      where: { documentId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find shares for user
   */
  async findByUser(userId: number): Promise<DocumentShare[]> {
    return this.find({
      where: { sharedWithId: userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find share by token
   */
  async findByToken(shareToken: string): Promise<DocumentShare | null> {
    return this.findOne({
      where: { shareToken, isActive: true },
    });
  }

  /**
   * Find share by link
   */
  async findByLink(shareLink: string): Promise<DocumentShare | null> {
    return this.findOne({
      where: { shareLink, isActive: true },
    });
  }

  /**
   * Find expired shares
   */
  async findExpired(): Promise<DocumentShare[]> {
    const now = new Date();
    return this.find({
      where: {
        expiresAt: LessThan(now),
        isActive: true,
      },
    });
  }

  /**
   * Deactivate expired shares
   */
  async deactivateExpired(): Promise<number> {
    const expired = await this.findExpired();
    let deactivated = 0;

    for (const share of expired) {
      share.isActive = false;
      await this.save(share);
      deactivated++;
    }

    return deactivated;
  }
}
