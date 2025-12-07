import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ComplianceRequirement, Priority } from '../entities/compliance-requirement.entity';

/**
 * Compliance Requirement Repository
 */
@Injectable()
export class ComplianceRequirementRepository extends Repository<ComplianceRequirement> {
  constructor(private dataSource: DataSource) {
    super(ComplianceRequirement, dataSource.createEntityManager());
  }

  /**
   * Find requirements by framework
   */
  async findByFramework(frameworkId: number): Promise<ComplianceRequirement[]> {
    return this.find({
      where: { frameworkId, isActive: true },
      order: { sortOrder: 'ASC', requirementCode: 'ASC' },
    });
  }

  /**
   * Find by requirement code
   */
  async findByCode(requirementCode: string): Promise<ComplianceRequirement | null> {
    return this.findOne({
      where: { requirementCode, isActive: true },
    });
  }

  /**
   * Find by priority
   */
  async findByPriority(priority: Priority): Promise<ComplianceRequirement[]> {
    return this.find({
      where: { priority, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }
}

