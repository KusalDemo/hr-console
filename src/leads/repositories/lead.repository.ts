import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Lead, LeadStatus, LeadSource, LeadPriority } from '../entities/lead.entity';

/**
 * Lead Repository
 * 
 * Custom repository methods for lead queries with pipeline tracking and conversion.
 */
@Injectable()
export class LeadRepository extends Repository<Lead> {
  constructor(private dataSource: DataSource) {
    super(Lead, dataSource.createEntityManager());
  }

  /**
   * Find lead by number
   */
  async findByNumber(leadNumber: string): Promise<Lead | null> {
    return this.createQueryBuilder('lead')
      .where('lead.leadNumber = :leadNumber', { leadNumber })
      .getOne();
  }

  /**
   * Find lead by ID
   */
  async findById(id: number, includeConvertedContact = false): Promise<Lead | null> {
    const query = this.createQueryBuilder('lead').where('lead.id = :id', { id });

    if (includeConvertedContact) {
      query.leftJoinAndSelect('lead.convertedContact', 'convertedContact');
    }

    return query.getOne();
  }

  /**
   * Find lead by email
   */
  async findByEmail(email: string): Promise<Lead | null> {
    return this.createQueryBuilder('lead')
      .where('lead.email = :email', { email })
      .orWhere('lead.emailSecondary = :email', { email })
      .getOne();
  }

  /**
   * Find leads by status
   */
  async findByStatus(
    status: LeadStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.leadStatus = :status', { status })
      .orderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find leads by source
   */
  async findBySource(
    source: LeadSource,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.leadSource = :source', { source })
      .orderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find leads by priority
   */
  async findByPriority(
    priority: LeadPriority,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.leadPriority = :priority', { priority })
      .orderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find leads by assigned user
   */
  async findByAssignedTo(
    assignedTo: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.assignedTo = :assignedTo', { assignedTo })
      .orderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find leads by campaign
   */
  async findByCampaign(
    campaignId: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.campaignId = :campaignId', { campaignId })
      .orderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find converted leads
   */
  async findConverted(
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.isConverted = :isConverted', { isConverted: true })
      .leftJoinAndSelect('lead.convertedContact', 'convertedContact')
      .orderBy('lead.conversionDate', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find unconverted leads
   */
  async findUnconverted(
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.isConverted = :isConverted', { isConverted: false })
      .orderBy('lead.leadScore', 'DESC')
      .addOrderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find leads by score range
   */
  async findByScoreRange(
    minScore: number,
    maxScore: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.leadScore >= :minScore', { minScore })
      .andWhere('lead.leadScore <= :maxScore', { maxScore })
      .orderBy('lead.leadScore', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find high-scoring leads
   */
  async findHighScoring(
    minScore: number,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.leadScore >= :minScore', { minScore })
      .andWhere('lead.isConverted = :isConverted', { isConverted: false })
      .orderBy('lead.leadScore', 'DESC')
      .addOrderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Search leads
   */
  async search(
    searchTerm: string,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where(
        `(
          lead.fullName ILIKE :searchTerm OR
          lead.displayName ILIKE :searchTerm OR
          lead.companyName ILIKE :searchTerm OR
          lead.email ILIKE :searchTerm OR
          lead.emailSecondary ILIKE :searchTerm OR
          lead.phone ILIKE :searchTerm OR
          lead.leadNumber ILIKE :searchTerm OR
          lead.tags ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('lead.leadScore', 'DESC')
      .addOrderBy('lead.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('lead.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find leads needing follow-up
   */
  async findNeedingFollowUp(
    organizationId?: number,
    daysAhead = 7,
  ): Promise<Lead[]> {
    const query = this.createQueryBuilder('lead')
      .where('lead.nextFollowUpDate IS NOT NULL')
      .andWhere('lead.nextFollowUpDate <= :endDate', {
        endDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
      })
      .andWhere('lead.isArchived = :isArchived', { isArchived: false })
      .andWhere('lead.isConverted = :isConverted', { isConverted: false })
      .orderBy('lead.nextFollowUpDate', 'ASC');

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStatistics(organizationId?: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byPriority: Record<string, number>;
    averageScore: number;
    convertedCount: number;
    conversionRate: number;
  }> {
    const query = this.createQueryBuilder('lead')
      .where('lead.isArchived = :isArchived', { isArchived: false });

    if (organizationId) {
      query.andWhere('lead.organizationId = :organizationId', { organizationId });
    }

    const leads = await query.getMany();

    const total = leads.length;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalScore = 0;
    let convertedCount = 0;

    leads.forEach((lead) => {
      byStatus[lead.leadStatus] = (byStatus[lead.leadStatus] || 0) + 1;
      bySource[lead.leadSource] = (bySource[lead.leadSource] || 0) + 1;
      byPriority[lead.leadPriority] = (byPriority[lead.leadPriority] || 0) + 1;
      totalScore += lead.leadScore;
      if (lead.isConverted) {
        convertedCount++;
      }
    });

    const averageScore = total > 0 ? totalScore / total : 0;
    const conversionRate = total > 0 ? (convertedCount / total) * 100 : 0;

    return {
      total,
      byStatus,
      bySource,
      byPriority,
      averageScore: Math.round(averageScore * 100) / 100,
      convertedCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Check if lead number exists
   */
  async leadNumberExists(leadNumber: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('lead')
      .where('lead.leadNumber = :leadNumber', { leadNumber });

    if (excludeId) {
      query.andWhere('lead.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}


