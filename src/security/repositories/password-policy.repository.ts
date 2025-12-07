import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PasswordPolicy } from '../entities/password-policy.entity';

/**
 * Password Policy Repository
 */
@Injectable()
export class PasswordPolicyRepository extends Repository<PasswordPolicy> {
  constructor(private dataSource: DataSource) {
    super(PasswordPolicy, dataSource.createEntityManager());
  }

  /**
   * Find default policy
   */
  async findDefault(): Promise<PasswordPolicy | null> {
    return this.findOne({
      where: { isDefault: true, isActive: true },
    });
  }

  /**
   * Find policy for organization
   */
  async findByOrganization(organizationId: number): Promise<PasswordPolicy | null> {
    return this.findOne({
      where: { organizationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find active policies
   */
  async findActive(): Promise<PasswordPolicy[]> {
    return this.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
