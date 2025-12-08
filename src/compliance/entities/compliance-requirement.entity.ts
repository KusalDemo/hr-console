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
import { User } from '../../users/entities/user.entity';

/**
 * Requirement Type Enum
 */
export enum RequirementType {
  CONTROL = 'CONTROL',
  POLICY = 'POLICY',
  PROCEDURE = 'PROCEDURE',
  TECHNICAL = 'TECHNICAL',
  ORGANIZATIONAL = 'ORGANIZATIONAL',
}

/**
 * Priority Enum
 */
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Compliance Requirement Entity
 *
 * Individual compliance requirements within frameworks.
 */
@Entity('compliance_requirements')
@Index('idx_compliance_requirements_framework', ['frameworkId'])
@Index('idx_compliance_requirements_code', ['requirementCode'])
@Index('idx_compliance_requirements_category', ['requirementCategory'])
@Index('idx_compliance_requirements_priority', ['priority'])
@Index('idx_compliance_requirements_parent', ['parentRequirementId'])
@Index('idx_compliance_requirements_active', ['isActive'])
export class ComplianceRequirement {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'requirement_key', type: 'varchar', length: 128, unique: true, nullable: false })
  requirementKey: string;

  @ManyToOne(() => ComplianceFramework, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'framework_id' })
  framework: Promise<ComplianceFramework> | ComplianceFramework;

  @Column({ name: 'framework_id', type: 'bigint', nullable: false })
  frameworkId: number;

  @Column({ name: 'requirement_code', type: 'varchar', length: 128, nullable: false })
  requirementCode: string;

  @Column({ name: 'requirement_title', type: 'varchar', length: 255, nullable: false })
  requirementTitle: string;

  @Column({ name: 'requirement_description', type: 'text', nullable: true })
  requirementDescription: string | null;

  @Column({ name: 'requirement_category', type: 'varchar', length: 128, nullable: true })
  requirementCategory: string | null;

  @Column({ name: 'requirement_type', type: 'varchar', length: 64, nullable: false })
  requirementType: RequirementType;

  @Column({ name: 'requirement_text', type: 'text', nullable: false })
  requirementText: string;

  @Column({ name: 'requirement_guidance', type: 'text', nullable: true })
  requirementGuidance: string | null;

  @Column({ name: 'legal_reference', type: 'varchar', length: 255, nullable: true })
  legalReference: string | null;

  @Column({ type: 'varchar', length: 32, nullable: false, default: Priority.MEDIUM })
  priority: Priority;

  @Column({ type: 'varchar', length: 32, nullable: false, default: Priority.MEDIUM })
  criticality: Priority;

  @Column({ name: 'is_mandatory', type: 'boolean', nullable: false, default: true })
  isMandatory: boolean;

  @ManyToOne(() => ComplianceRequirement, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'parent_requirement_id' })
  parentRequirement: Promise<ComplianceRequirement> | ComplianceRequirement | null;

  @Column({ name: 'parent_requirement_id', type: 'bigint', nullable: true })
  parentRequirementId: number | null;

  @Column({ name: 'related_requirements', type: 'jsonb', nullable: true })
  relatedRequirements: number[] | null;

  @Column({ name: 'evidence_required', type: 'boolean', nullable: false, default: true })
  evidenceRequired: boolean;

  @Column({ name: 'evidence_types', type: 'jsonb', nullable: true })
  evidenceTypes: string[] | null;

  @Column({ name: 'validation_method', type: 'varchar', length: 64, nullable: true })
  validationMethod: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'integer', nullable: false, default: 0 })
  sortOrder: number;

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


