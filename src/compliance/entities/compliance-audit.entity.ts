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
import { ComplianceFramework } from './compliance-framework.entity';
import { ComplianceChecklist } from './compliance-checklist.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Audit Type Enum
 */
export enum AuditType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
  SELF_ASSESSMENT = 'SELF_ASSESSMENT',
  CERTIFICATION = 'CERTIFICATION',
}

/**
 * Audit Status Enum
 */
export enum AuditStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

/**
 * Compliance Audit Entity
 * 
 * Compliance audit records.
 */
@Entity('compliance_audits')
@Index('idx_compliance_audits_framework', ['frameworkId'])
@Index('idx_compliance_audits_checklist', ['checklistId'])
@Index('idx_compliance_audits_status', ['auditStatus'])
@Index('idx_compliance_audits_type', ['auditType'])
@Index('idx_compliance_audits_start_date', ['auditStartDate'])
@Index('idx_compliance_audits_lead', ['auditLeadId'])
export class ComplianceAudit {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'audit_key', type: 'varchar', length: 128, unique: true, nullable: false })
  auditKey: string;

  @ManyToOne(() => ComplianceFramework, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'framework_id' })
  framework: Promise<ComplianceFramework> | ComplianceFramework;

  @Column({ name: 'framework_id', type: 'bigint', nullable: false })
  frameworkId: number;

  @ManyToOne(() => ComplianceChecklist, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'checklist_id' })
  checklist: Promise<ComplianceChecklist> | ComplianceChecklist | null;

  @Column({ name: 'checklist_id', type: 'bigint', nullable: true })
  checklistId: number | null;

  @Column({ name: 'audit_name', type: 'varchar', length: 255, nullable: false })
  auditName: string;

  @Column({ name: 'audit_type', type: 'varchar', length: 64, nullable: false })
  auditType: AuditType;

  @Column({ name: 'audit_scope', type: 'text', nullable: true })
  auditScope: string | null;

  @Column({ name: 'audit_description', type: 'text', nullable: true })
  auditDescription: string | null;

  @Column({ name: 'audit_start_date', type: 'date', nullable: false })
  auditStartDate: Date;

  @Column({ name: 'audit_end_date', type: 'date', nullable: true })
  auditEndDate: Date | null;

  @Column({ name: 'audit_status', type: 'varchar', length: 32, nullable: false, default: AuditStatus.PLANNED })
  auditStatus: AuditStatus;

  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallScore: number | null;

  @Column({ name: 'compliance_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  compliancePercentage: number | null;

  @Column({ name: 'total_requirements', type: 'integer', nullable: false, default: 0 })
  totalRequirements: number;

  @Column({ name: 'compliant_requirements', type: 'integer', nullable: false, default: 0 })
  compliantRequirements: number;

  @Column({ name: 'non_compliant_requirements', type: 'integer', nullable: false, default: 0 })
  nonCompliantRequirements: number;

  @Column({ name: 'partially_compliant', type: 'integer', nullable: false, default: 0 })
  partiallyCompliant: number;

  @Column({ name: 'exempt_requirements', type: 'integer', nullable: false, default: 0 })
  exemptRequirements: number;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'audit_lead_id' })
  auditLead: Promise<User> | User | null;

  @Column({ name: 'audit_lead_id', type: 'bigint', nullable: true })
  auditLeadId: number | null;

  @Column({ name: 'auditor_ids', type: 'jsonb', nullable: true })
  auditorIds: number[] | null;

  @Column({ name: 'auditee_ids', type: 'jsonb', nullable: true })
  auditeeIds: number[] | null;

  @Column({ name: 'external_auditor_name', type: 'varchar', length: 255, nullable: true })
  externalAuditorName: string | null;

  @Column({ name: 'external_auditor_contact', type: 'varchar', length: 255, nullable: true })
  externalAuditorContact: string | null;

  @Column({ name: 'findings_count', type: 'integer', nullable: false, default: 0 })
  findingsCount: number;

  @Column({ name: 'critical_findings', type: 'integer', nullable: false, default: 0 })
  criticalFindings: number;

  @Column({ name: 'high_findings', type: 'integer', nullable: false, default: 0 })
  highFindings: number;

  @Column({ name: 'medium_findings', type: 'integer', nullable: false, default: 0 })
  mediumFindings: number;

  @Column({ name: 'low_findings', type: 'integer', nullable: false, default: 0 })
  lowFindings: number;

  @Column({ name: 'audit_report_path', type: 'varchar', length: 512, nullable: true })
  auditReportPath: string | null;

  @Column({ name: 'audit_report_generated_at', type: 'timestamptz', nullable: true })
  auditReportGeneratedAt: Date | null;

  @Column({ name: 'requires_remediation', type: 'boolean', nullable: false, default: false })
  requiresRemediation: boolean;

  @Column({ name: 'remediation_plan_id', type: 'bigint', nullable: true })
  remediationPlanId: number | null;

  @Column({ name: 'next_audit_date', type: 'date', nullable: true })
  nextAuditDate: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

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
