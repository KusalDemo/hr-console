import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import { Session } from '../entities/session.entity';

/**
 * Session Repository
 */
@Injectable()
export class SessionRepository extends Repository<Session> {
  constructor(private dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  /**
   * Find active sessions for user
   */
  async findActiveByUser(userId: number): Promise<Session[]> {
    return this.find({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      },
      order: { lastAccessedAt: 'DESC' },
    });
  }

  /**
   * Find session by token
   */
  async findByToken(sessionToken: string): Promise<Session | null> {
    return this.findOne({
      where: { sessionToken, isActive: true },
    });
  }

  /**
   * Find expired sessions
   */
  async findExpired(): Promise<Session[]> {
    return this.find({
      where: {
        expiresAt: LessThan(new Date()),
        isActive: true,
      },
    });
  }
}


