import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Consent, ConsentStatus, ConsentType } from '../entities/consent.entity';

/**
 * Consent Repository
 */
@Injectable()
export class ConsentRepository extends Repository<Consent> {
  constructor(private dataSource: DataSource) {
    super(Consent, dataSource.createEntityManager());
  }

  /**
   * Find active consents for data subject
   */
  async findActiveByDataSubject(
    dataSubjectEmail: string,
    dataSubjectId?: number,
  ): Promise<Consent[]> {
    const where: any = {
      dataSubjectEmail,
      consentStatus: ConsentStatus.GIVEN,
    };
    if (dataSubjectId) {
      where.dataSubjectId = dataSubjectId;
    }

    return this.find({
      where,
      order: { givenAt: 'DESC' },
    });
  }

  /**
   * Find consents by type
   */
  async findByType(consentType: ConsentType): Promise<Consent[]> {
    return this.find({
      where: { consentType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find expired consents
   */
  async findExpired(): Promise<Consent[]> {
    return this.createQueryBuilder('consent')
      .where('consent.expiresAt < :now', { now: new Date() })
      .andWhere('consent.consentStatus = :status', { status: ConsentStatus.GIVEN })
      .getMany();
  }
}

