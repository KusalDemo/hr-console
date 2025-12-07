import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PrivacyPolicyAcceptance, PolicyType } from '../entities/privacy-policy-acceptance.entity';

/**
 * Privacy Policy Acceptance Repository
 */
@Injectable()
export class PrivacyPolicyAcceptanceRepository extends Repository<PrivacyPolicyAcceptance> {
  constructor(private dataSource: DataSource) {
    super(PrivacyPolicyAcceptance, dataSource.createEntityManager());
  }

  /**
   * Find latest acceptance for user and policy type
   */
  async findLatest(
    userId: number,
    policyType: PolicyType,
  ): Promise<PrivacyPolicyAcceptance | null> {
    return this.findOne({
      where: { userId, policyType },
      order: { acceptedAt: 'DESC' },
    });
  }

  /**
   * Find all acceptances for user
   */
  async findByUser(userId: number): Promise<PrivacyPolicyAcceptance[]> {
    return this.find({
      where: { userId },
      order: { acceptedAt: 'DESC' },
    });
  }

  /**
   * Check if user has accepted policy version
   */
  async hasAcceptedVersion(
    userId: number,
    policyType: PolicyType,
    policyVersion: string,
  ): Promise<boolean> {
    const count = await this.count({
      where: {
        userId,
        policyType,
        policyVersion,
        withdrawnAt: null as any, // Not withdrawn
      },
    });

    return count > 0;
  }
}
