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
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Checklist Type Enum
 */
export enum ChecklistType {
  INITIAL = 'INITIAL',
  PERIODIC = 'PERIODIC',
  AUDIT = 'AUDIT',
  REMEDIATION = 'REMEDIATION',
}

/**
 * Checklist Status Enum
 */
export enum ChecklistStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Compliance Checklist Entity
 * 
 * Tenant-specific compliance checklists.
 */
@Entity('compliance_checklists')
@Index('idx_compliance_checklists_framework', ['frameworkId'])
@Index('idx_compliance_checklists_status', ['checklistStatus'])
@Index('idx_compliance_checklists_organization', ['organizationId'])
@Index('idx_compliance_checklists_assigned', ['assignedToId'])
@Index('idx_compliance_checklists_target_date', ['targetCompletionDate'])
export class ComplianceChecklist {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'checklist_key', type: 'varchar', length: 128, unique: true, nullable: false })
  checklistKey: string;

  @ManyToOne(() => ComplianceFramework, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'framework_id' })
  framework: Promise<ComplianceFramework> | ComplianceFramework;

  @Column({ name: 'framework_id', type: 'bigint', nullable: false })
  frameworkId: number;

  @Column({ name: 'checklist_name', type: 'varchar', length: 255, nullable: false })
  checklistName: string;

  @Column({ name: 'checklist_description', type: 'text', nullable: true })
  checklistDescription: string | null;

  @Column({ name: 'checklist_type', type: 'varchar', length: 64, nullable: false })
  checklistType: ChecklistType;

  @Column({ name: 'checklist_version', type: 'varchar', length: 32, nullable: false, default: '1.0' })
  checklistVersion: string;

  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  @Column({ name: 'is_tenant_wide', type: 'boolean', nullable: false, default: true })
  isTenantWide: boolean;

  @Column({ name: 'checklist_status', type: 'varchar', length: 32, nullable: false, default: ChecklistStatus.DRAFT })
  checklistStatus: ChecklistStatus;

  @Column({ name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2, nullable: false, default: 0.0 })
  completionPercentage: number;

  @Column({ name: 'total_requirements', type: 'integer', nullable: false, default: 0 })
  totalRequirements: number;

  @Column({ name: 'completed_requirements', type: 'integer', nullable: false, default: 0 })
  completedRequirements: number;

  @Column({ name: 'in_progress_requirements', type: 'integer', nullable: false, default: 0 })
  inProgressRequirements: number;

  @Column({ name: 'not_started_requirements', type: 'integer', nullable: false, default: 0 })
  notStartedRequirements: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'target_completion_date', type: 'date', nullable: true })
  targetCompletionDate: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: Promise<User> | User | null;

  @Column({ name: 'assigned_to', type: 'bigint', nullable: true })
  assignedToId: number | null;

  @Column({ name: 'assigned_team', type: 'bigint', nullable: true })
  assignedTeam: number | null;

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

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
