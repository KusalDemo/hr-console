import { Injectable } from '@nestjs/common';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { FailedLoginAttempt } from '../entities/failed-login-attempt.entity';

/**
 * Failed Login Attempt Repository
 */
@Injectable()
export class FailedLoginAttemptRepository extends Repository<FailedLoginAttempt> {
  constructor(private dataSource: DataSource) {
    super(FailedLoginAttempt, dataSource.createEntityManager());
  }

  /**
   * Count recent failed attempts for user
   */
  async countRecentByUser(userId: number, minutes: number = 30): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.count({
      where: {
        userId,
        createdAt: MoreThan(since),
      },
    });
  }

  /**
   * Count recent failed attempts by email
   */
  async countRecentByEmail(email: string, minutes: number = 30): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.count({
      where: {
        email,
        createdAt: MoreThan(since),
      },
    });
  }

  /**
   * Count recent failed attempts by IP
   */
  async countRecentByIp(ipAddress: string, minutes: number = 30): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.count({
      where: {
        ipAddress,
        createdAt: MoreThan(since),
      },
    });
  }

  /**
   * Clean up old failed attempts
   */
  async cleanupOldAttempts(days: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.createQueryBuilder()
      .delete()
      .from(FailedLoginAttempt)
      .where('created_at < :cutoff', { cutoff })
      .execute();

    return result.affected || 0;
  }
}

