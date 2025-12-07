import { Injectable } from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { IpWhitelist } from '../entities/ip-whitelist.entity';

/**
 * IP Whitelist Repository
 */
@Injectable()
export class IpWhitelistRepository extends Repository<IpWhitelist> {
  constructor(private dataSource: DataSource) {
    super(IpWhitelist, dataSource.createEntityManager());
  }

  /**
   * Check if IP is whitelisted
   */
  async isIpWhitelisted(
    ipAddress: string,
    organizationId?: number,
    userId?: number,
  ): Promise<boolean> {
    // Check tenant-wide whitelist
    const tenantWide = await this.count({
      where: {
        ipAddress,
        isActive: true,
        organizationId: IsNull(),
        userId: IsNull(),
      },
    });

    if (tenantWide > 0) {
      return true;
    }

    // Check organization-specific whitelist
    if (organizationId) {
      const orgWide = await this.count({
        where: {
          ipAddress,
          organizationId,
          isActive: true,
          userId: IsNull(),
        },
      });

      if (orgWide > 0) {
        return true;
      }
    }

    // Check user-specific whitelist
    if (userId) {
      const userSpecific = await this.count({
        where: {
          ipAddress,
          userId,
          isActive: true,
        },
      });

      if (userSpecific > 0) {
        return true;
      }
    }

    // Check IP ranges
    const ranges = await this.find({
      where: {
        isActive: true,
        ipRangeStart: null as any, // This will be handled by query
      },
    });

    for (const range of ranges) {
      if (range.ipRangeStart && range.ipRangeEnd) {
        if (this.isIpInRange(ipAddress, range.ipRangeStart, range.ipRangeEnd)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find active whitelist entries
   */
  async findActive(): Promise<IpWhitelist[]> {
    return this.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Private helper method
  private isIpInRange(ip: string, start: string, end: string): boolean {
    const ipNum = this.ipToNumber(ip);
    const startNum = this.ipToNumber(start);
    const endNum = this.ipToNumber(end);
    return ipNum >= startNum && ipNum <= endNum;
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
}
