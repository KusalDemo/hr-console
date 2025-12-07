import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FormResponse, FormResponseStatus } from '../entities/form-response.entity';

/**
 * Form Response Repository
 *
 * Custom repository methods for form response queries.
 */
@Injectable()
export class FormResponseRepository extends Repository<FormResponse> {
  constructor(private dataSource: DataSource) {
    super(FormResponse, dataSource.createEntityManager());
  }

  /**
   * Find response by ID
   */
  async findById(id: number): Promise<FormResponse | null> {
    return this.createQueryBuilder('response')
      .leftJoinAndSelect('response.formDefinition', 'form')
      .where('response.id = :id', { id })
      .getOne();
  }

  /**
   * Find responses by form definition
   */
  async findByFormDefinition(
    formDefinitionId: number,
    includeInactive = false,
  ): Promise<FormResponse[]> {
    const query = this.createQueryBuilder('response')
      .where('response.formDefinitionId = :formDefinitionId', { formDefinitionId })
      .orderBy('response.submittedAt', 'DESC')
      .addOrderBy('response.createdAt', 'DESC');

    if (!includeInactive) {
      query.andWhere('response.status != :status', { status: FormResponseStatus.DRAFT });
    }

    return query.getMany();
  }

  /**
   * Find responses by user
   */
  async findByUser(userId: number, formDefinitionId?: number): Promise<FormResponse[]> {
    const query = this.createQueryBuilder('response')
      .where('response.submittedBy = :userId', { userId })
      .andWhere('response.isAnonymous = :isAnonymous', { isAnonymous: false })
      .orderBy('response.submittedAt', 'DESC');

    if (formDefinitionId) {
      query.andWhere('response.formDefinitionId = :formDefinitionId', { formDefinitionId });
    }

    return query.getMany();
  }

  /**
   * Find responses by status
   */
  async findByStatus(
    status: FormResponseStatus,
    formDefinitionId?: number,
  ): Promise<FormResponse[]> {
    const query = this.createQueryBuilder('response')
      .where('response.status = :status', { status })
      .orderBy('response.submittedAt', 'DESC');

    if (formDefinitionId) {
      query.andWhere('response.formDefinitionId = :formDefinitionId', { formDefinitionId });
    }

    return query.getMany();
  }

  /**
   * Find anonymous responses
   */
  async findAnonymous(formDefinitionId?: number): Promise<FormResponse[]> {
    const query = this.createQueryBuilder('response')
      .where('response.isAnonymous = :isAnonymous', { isAnonymous: true })
      .orderBy('response.submittedAt', 'DESC');

    if (formDefinitionId) {
      query.andWhere('response.formDefinitionId = :formDefinitionId', { formDefinitionId });
    }

    return query.getMany();
  }

  /**
   * Count responses by form definition
   */
  async countByFormDefinition(
    formDefinitionId: number,
    status?: FormResponseStatus,
  ): Promise<number> {
    const query = this.createQueryBuilder('response').where(
      'response.formDefinitionId = :formDefinitionId',
      { formDefinitionId },
    );

    if (status) {
      query.andWhere('response.status = :status', { status });
    }

    return query.getCount();
  }

  /**
   * Count responses by user for form
   */
  async countByUserForForm(userId: number, formDefinitionId: number): Promise<number> {
    return this.createQueryBuilder('response')
      .where('response.submittedBy = :userId', { userId })
      .andWhere('response.formDefinitionId = :formDefinitionId', { formDefinitionId })
      .andWhere('response.isAnonymous = :isAnonymous', { isAnonymous: false })
      .getCount();
  }

  /**
   * Get response statistics
   */
  async getStatistics(
    formDefinitionId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    anonymous: number;
    authenticated: number;
  }> {
    const query = this.createQueryBuilder('response').where(
      'response.formDefinitionId = :formDefinitionId',
      { formDefinitionId },
    );

    if (startDate) {
      query.andWhere('response.submittedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('response.submittedAt <= :endDate', { endDate });
    }

    const responses = await query.getMany();

    const statistics = {
      total: responses.length,
      byStatus: {} as Record<string, number>,
      anonymous: 0,
      authenticated: 0,
    };

    responses.forEach((response) => {
      // Count by status
      statistics.byStatus[response.status] = (statistics.byStatus[response.status] || 0) + 1;

      // Count anonymous vs authenticated
      if (response.isAnonymous) {
        statistics.anonymous++;
      } else {
        statistics.authenticated++;
      }
    });

    return statistics;
  }

  /**
   * Search responses
   */
  async searchResponses(
    formDefinitionId?: number,
    status?: FormResponseStatus,
    submittedBy?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FormResponse[]> {
    const query = this.createQueryBuilder('response').orderBy('response.submittedAt', 'DESC');

    if (formDefinitionId) {
      query.andWhere('response.formDefinitionId = :formDefinitionId', { formDefinitionId });
    }

    if (status) {
      query.andWhere('response.status = :status', { status });
    }

    if (submittedBy) {
      query.andWhere('response.submittedBy = :submittedBy', { submittedBy });
    }

    if (startDate) {
      query.andWhere('response.submittedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('response.submittedAt <= :endDate', { endDate });
    }

    return query.getMany();
  }
}
