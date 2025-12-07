import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session, DeviceType } from '../entities/session.entity';
import { User } from '../../users/entities/user.entity';
import * as crypto from 'crypto';

/**
 * Session Service
 * 
 * Manages user sessions with device tracking, IP geolocation, and session revocation.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a new session
   */
  async createSession(
    userId: number,
    sessionToken: string,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<Session> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Detect device type from user agent
    const deviceType = this.detectDeviceType(userAgent);

    // Get location from IP (placeholder - integrate with geolocation service)
    const location = await this.getLocationFromIp(ipAddress);

    const session = this.sessionRepository.create({
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      deviceFingerprint,
      deviceType,
      deviceName: this.getDeviceName(userAgent),
      locationCountry: location?.country || null,
      locationCity: location?.city || null,
      isActive: true,
      isTrusted: false,
      expiresAt: new Date(Date.now() + this.SESSION_DURATION_MS),
      lastAccessedAt: new Date(),
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: number): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date(Date.now() + this.SESSION_DURATION_MS)),
      },
      order: { lastAccessedAt: 'DESC' },
    });
  }

  /**
   * Get session by token
   */
  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: { sessionToken, isActive: true },
    });
  }

  /**
   * Update session last accessed time
   */
  async updateLastAccessed(sessionId: number): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      lastAccessedAt: new Date(),
    });
  }

  /**
   * Revoke a session
   */
  async revokeSession(
    sessionId: number,
    revokedById?: number,
    reason?: string,
  ): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      isActive: false,
      revokedAt: new Date(),
      revokedById: revokedById || null,
      revokeReason: reason || null,
    });
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(
    userId: number,
    revokedById?: number,
    reason?: string,
  ): Promise<void> {
    await this.sessionRepository.update(
      { userId, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedById: revokedById || null,
        revokeReason: reason || 'All sessions revoked',
      },
    );
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeOtherSessions(
    userId: number,
    currentSessionToken: string,
    revokedById?: number,
  ): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedById: revokedById || null,
        revokeReason: 'Other sessions revoked',
      })
      .where('userId = :userId', { userId })
      .andWhere('sessionToken != :currentSessionToken', { currentSessionToken })
      .andWhere('isActive = true')
      .execute();
  }

  /**
   * Mark device as trusted
   */
  async trustDevice(sessionId: number): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      isTrusted: true,
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('isActive = true')
      .execute();

    return result.affected || 0;
  }

  /**
   * Get session statistics for user
   */
  async getSessionStats(userId: number): Promise<{
    totalSessions: number;
    activeSessions: number;
    trustedDevices: number;
  }> {
    const [total, active, trusted] = await Promise.all([
      this.sessionRepository.count({ where: { userId } }),
      this.sessionRepository.count({
        where: { userId, isActive: true },
      }),
      this.sessionRepository.count({
        where: { userId, isTrusted: true, isActive: true },
      }),
    ]);

    return {
      totalSessions: total,
      activeSessions: active,
      trustedDevices: trusted,
    };
  }

  // Private helper methods

  private detectDeviceType(userAgent?: string): DeviceType {
    if (!userAgent) {
      return DeviceType.OTHER;
    }

    const ua = userAgent.toLowerCase();

    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return DeviceType.MOBILE;
    }

    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return DeviceType.TABLET;
    }

    if (/desktop|laptop|windows|macintosh|linux/i.test(ua)) {
      return DeviceType.DESKTOP;
    }

    return DeviceType.OTHER;
  }

  private getDeviceName(userAgent?: string): string {
    if (!userAgent) {
      return 'Unknown Device';
    }

    // Extract browser and OS info
    const ua = userAgent.toLowerCase();
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Browser detection
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('edg')) {
      browser = 'Edge';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
    }

    // OS detection
    if (ua.includes('windows')) {
      os = 'Windows';
    } else if (ua.includes('mac')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    return `${browser} on ${os}`;
  }

  private async getLocationFromIp(
    ipAddress?: string,
  ): Promise<{ country: string; city: string } | null> {
    if (!ipAddress) {
      return null;
    }

    // TODO: Integrate with IP geolocation service (MaxMind, ipapi.co, etc.)
    // For now, return null
    // Example: const location = await this.geolocationService.getLocation(ipAddress);
    return null;
  }
}
