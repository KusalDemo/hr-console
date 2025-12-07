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
import { ComplianceAudit } from './compliance-audit.entity';
import { ComplianceRequirement } from './compliance-requirement.entity';
import { ComplianceChecklistItem } from './compliance-checklist-item.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Finding Type Enum
 */
export enum FindingType {
  NON_COMPLIANCE = 'NON_COMPLIANCE',
  PARTIAL_COMPLIANCE = 'PARTIAL_COMPLIANCE',
  OBSERVATION = 'OBSERVATION',
  RECOMMENDATION = 'RECOMMENDATION',
}

/**
 * Severity Enum
 */
export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

/**
 * Remediation Status Enum
 */
export enum RemediationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  OVERDUE = 'OVERDUE',
}

/**
 * Finding Status Enum
 */
export enum FindingStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ACCEPTED_RISK = 'ACCEPTED_RISK',
}

/**
 * Compliance Audit Finding Entity
 * 
 * Individual findings from compliance audits.
 */
@Entity('compliance_audit_findings')
@Index('idx_audit_findings_audit', ['auditId'])
@Index('idx_audit_findings_requirement', ['requirementId'])
@Index('idx_audit_findings_status', ['findingStatus'])
@Index('idx_audit_findings_severity', ['severity'])
@Index('idx_audit_findings_remediation_status', ['remediationStatus'])
@Index('idx_audit_findings_assigned', ['assignedToId'])
export class ComplianceAuditFinding {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => ComplianceAudit, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'audit_id' })
  audit: Promise<ComplianceAudit> | ComplianceAudit;

  @Column({ name: 'audit_id', type: 'bigint', nullable: false })
  auditId: number;

  @ManyToOne(() => ComplianceRequirement, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'requirement_id' })
  requirement: Promise<ComplianceRequirement> | ComplianceRequirement | null;

  @Column({ name: 'requirement_id', type: 'bigint', nullable: true })
  requirementId: number | null;

  @ManyToOne(() => ComplianceChecklistItem, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'checklist_item_id' })
  checklistItem: Promise<ComplianceChecklistItem> | ComplianceChecklistItem | null;

  @Column({ name: 'checklist_item_id', type: 'bigint', nullable: true })
  checklistItemId: number | null;

  @Column({ name: 'finding_type', type: 'varchar', length: 32, nullable: false })
  findingType: FindingType;

  @Column({ type: 'varchar', length: 32, nullable: false })
  severity: Severity;

  @Column({ name: 'finding_title', type: 'varchar', length: 255, nullable: false })
  findingTitle: string;

  @Column({ name: 'finding_description', type: 'text', nullable: false })
  findingDescription: string;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause: string | null;

  @Column({ type: 'text', nullable: true })
  impact: string | null;

  @Column({ name: 'remediation_required', type: 'boolean', nullable: false, default: true })
  remediationRequired: boolean;

  @Column({ name: 'remediation_description', type: 'text', nullable: true })
  remediationDescription: string | null;

  @Column({ name: 'remediation_deadline', type: 'date', nullable: true })
  remediationDeadline: Date | null;

  @Column({ name: 'remediation_status', type: 'varchar', length: 32, nullable: false, default: RemediationStatus.PENDING })
  remediationStatus: RemediationStatus;

  @Column({ name: 'remediation_completed_at', type: 'timestamptz', nullable: true })
  remediationCompletedAt: Date | null;

  @Column({ name: 'remediation_verified_at', type: 'timestamptz', nullable: true })
  remediationVerifiedAt: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'remediation_verified_by' })
  remediationVerifiedBy: Promise<User> | User | null;

  @Column({ name: 'remediation_verified_by', type: 'bigint', nullable: true })
  remediationVerifiedById: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: Promise<User> | User | null;

  @Column({ name: 'assigned_to', type: 'bigint', nullable: true })
  assignedToId: number | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  @Column({ name: 'finding_status', type: 'varchar', length: 32, nullable: false, default: FindingStatus.OPEN })
  findingStatus: FindingStatus;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy: Promise<User> | User | null;

  @Column({ name: 'resolved_by', type: 'bigint', nullable: true })
  resolvedById: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'created_by' })
  createdBy: Promise<User> | User | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Promise<User> | User | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedById: number | null;
}
