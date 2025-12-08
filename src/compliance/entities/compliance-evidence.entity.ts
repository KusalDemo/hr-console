import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ComplianceRequirement } from './compliance-requirement.entity';
import { ComplianceChecklistItem } from './compliance-checklist-item.entity';
import { ComplianceAudit } from './compliance-audit.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Evidence Type Enum
 */
export enum EvidenceType {
  DOCUMENT = 'DOCUMENT',
  SCREENSHOT = 'SCREENSHOT',
  LOG = 'LOG',
  TEST_RESULT = 'TEST_RESULT',
  POLICY = 'POLICY',
  PROCEDURE = 'PROCEDURE',
  TRAINING_RECORD = 'TRAINING_RECORD',
  CERTIFICATE = 'CERTIFICATE',
}

/**
 * Compliance Evidence Entity
 *
 * Evidence collected for compliance requirements.
 */
@Entity('compliance_evidence')
@Index('idx_compliance_evidence_requirement', ['requirementId'])
@Index('idx_compliance_evidence_checklist_item', ['checklistItemId'])
@Index('idx_compliance_evidence_audit', ['auditId'])
@Index('idx_compliance_evidence_type', ['evidenceType'])
@Index('idx_compliance_evidence_validated', ['isValidated'])
@Index('idx_compliance_evidence_collected_by', ['collectedById'])
@Index('idx_compliance_evidence_expires', ['expiresAt'])
export class ComplianceEvidence {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'evidence_key', type: 'varchar', length: 128, unique: true, nullable: false })
  evidenceKey: string;

  @ManyToOne(() => ComplianceRequirement, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'requirement_id' })
  requirement: Promise<ComplianceRequirement> | ComplianceRequirement;

  @Column({ name: 'requirement_id', type: 'bigint', nullable: false })
  requirementId: number;

  @ManyToOne(() => ComplianceChecklistItem, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'checklist_item_id' })
  checklistItem: Promise<ComplianceChecklistItem> | ComplianceChecklistItem | null;

  @Column({ name: 'checklist_item_id', type: 'bigint', nullable: true })
  checklistItemId: number | null;

  @ManyToOne(() => ComplianceAudit, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'audit_id' })
  audit: Promise<ComplianceAudit> | ComplianceAudit | null;

  @Column({ name: 'audit_id', type: 'bigint', nullable: true })
  auditId: number | null;

  @Column({ name: 'evidence_type', type: 'varchar', length: 64, nullable: false })
  evidenceType: EvidenceType;

  @Column({ name: 'evidence_name', type: 'varchar', length: 255, nullable: false })
  evidenceName: string;

  @Column({ name: 'evidence_description', type: 'text', nullable: true })
  evidenceDescription: string | null;

  @Column({ name: 'file_path', type: 'varchar', length: 512, nullable: true })
  filePath: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({ name: 'file_type', type: 'varchar', length: 64, nullable: true })
  fileType: string | null;

  @Column({ name: 'file_hash', type: 'varchar', length: 256, nullable: true })
  fileHash: string | null;

  @Column({ name: 'evidence_date', type: 'date', nullable: true })
  evidenceDate: Date | null;

  @Column({ name: 'collected_at', type: 'timestamptz', nullable: false, default: () => 'now()' })
  collectedAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'collected_by' })
  collectedBy: Promise<User> | User | null;

  @Column({ name: 'collected_by', type: 'bigint', nullable: true })
  collectedById: number | null;

  @Column({ name: 'is_validated', type: 'boolean', nullable: false, default: false })
  isValidated: boolean;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'validated_by' })
  validatedBy: Promise<User> | User | null;

  @Column({ name: 'validated_by', type: 'bigint', nullable: true })
  validatedById: number | null;

  @Column({ name: 'validation_notes', type: 'text', nullable: true })
  validationNotes: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'related_evidence_ids', type: 'jsonb', nullable: true })
  relatedEvidenceIds: number[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}


