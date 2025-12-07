import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ComplianceFramework, FrameworkType } from '../entities/compliance-framework.entity';

/**
 * Compliance Framework Repository
 */
@Injectable()
export class ComplianceFrameworkRepository extends Repository<ComplianceFramework> {
  constructor(private dataSource: DataSource) {
    super(ComplianceFramework, dataSource.createEntityManager());
  }

  /**
   * Find enabled frameworks
   */
  async findEnabled(): Promise<ComplianceFramework[]> {
    return this.find({
      where: { isEnabled: true, isActive: true },
      order: { frameworkName: 'ASC' },
    });
  }

  /**
   * Find by framework code
   */
  async findByCode(frameworkCode: string): Promise<ComplianceFramework | null> {
    return this.findOne({
      where: { frameworkCode, isActive: true },
    });
  }

  /**
   * Find by framework type
   */
  async findByType(frameworkType: FrameworkType): Promise<ComplianceFramework[]> {
    return this.find({
      where: { frameworkType, isActive: true },
      order: { frameworkName: 'ASC' },
    });
  }
}

