import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  DataSubjectRequest,
  RequestType,
  RequestStatus,
} from '../entities/data-subject-request.entity';

/**
 * Data Subject Request Repository
 */
@Injectable()
export class DataSubjectRequestRepository extends Repository<DataSubjectRequest> {
  constructor(private dataSource: DataSource) {
    super(DataSubjectRequest, dataSource.createEntityManager());
  }

  /**
   * Find requests by status
   */
  async findByStatus(status: RequestStatus): Promise<DataSubjectRequest[]> {
    return this.find({
      where: { requestStatus: status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find requests by type
   */
  async findByType(type: RequestType): Promise<DataSubjectRequest[]> {
    return this.find({
      where: { requestType: type },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find requests by email
   */
  async findByEmail(email: string): Promise<DataSubjectRequest[]> {
    return this.find({
      where: { dataSubjectEmail: email },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find overdue requests
   */
  async findOverdue(): Promise<DataSubjectRequest[]> {
    return this.createQueryBuilder('request')
      .where('request.dueDate < :now', { now: new Date() })
      .andWhere('request.requestStatus IN (:...statuses)', {
        statuses: [RequestStatus.PENDING, RequestStatus.IN_PROGRESS],
      })
      .orderBy('request.dueDate', 'ASC')
      .getMany();
  }
}


