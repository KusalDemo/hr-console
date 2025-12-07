import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ComplianceEvidence, EvidenceType } from '../entities/compliance-evidence.entity';

/**
 * Compliance Evidence Repository
 */
@Injectable()
export class ComplianceEvidenceRepository extends Repository<ComplianceEvidence> {
  constructor(private dataSource: DataSource) {
    super(ComplianceEvidence, dataSource.createEntityManager());
  }

  /**
   * Find evidence by requirement
   */
  async findByRequirement(requirementId: number): Promise<ComplianceEvidence[]> {
    return this.find({
      where: { requirementId, isActive: true },
      order: { collectedAt: 'DESC' },
    });
  }

  /**
   * Find evidence by checklist item
   */
  async findByChecklistItem(checklistItemId: number): Promise<ComplianceEvidence[]> {
    return this.find({
      where: { checklistItemId, isActive: true },
      order: { collectedAt: 'DESC' },
    });
  }

  /**
   * Find evidence by type
   */
  async findByType(evidenceType: EvidenceType): Promise<ComplianceEvidence[]> {
    return this.find({
      where: { evidenceType, isActive: true },
      order: { collectedAt: 'DESC' },
    });
  }

  /**
   * Find validated evidence
   */
  async findValidated(): Promise<ComplianceEvidence[]> {
    return this.find({
      where: { isValidated: true, isActive: true },
      order: { validatedAt: 'DESC' },
    });
  }
}
