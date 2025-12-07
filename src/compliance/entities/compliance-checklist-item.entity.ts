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
import { ComplianceChecklist } from './compliance-checklist.entity';
import { ComplianceRequirement } from './compliance-requirement.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Item Status Enum
 */
export enum ItemStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXEMPT = 'EXEMPT',
  N_A = 'N/A',
}

/**
 * Compliance Checklist Item Entity
 *
 * Individual items in compliance checklists.
 */
@Entity('compliance_checklist_items')
@Index('idx_checklist_items_checklist', ['checklistId'])
@Index('idx_checklist_items_requirement', ['requirementId'])
@Index('idx_checklist_items_status', ['itemStatus'])
@Index('idx_checklist_items_assigned', ['assignedToId'])
@Index('idx_checklist_items_due_date', ['dueDate'])
export class ComplianceChecklistItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => ComplianceChecklist, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'checklist_id' })
  checklist: Promise<ComplianceChecklist> | ComplianceChecklist;

  @Column({ name: 'checklist_id', type: 'bigint', nullable: false })
  checklistId: number;

  @ManyToOne(() => ComplianceRequirement, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'requirement_id' })
  requirement: Promise<ComplianceRequirement> | ComplianceRequirement;

  @Column({ name: 'requirement_id', type: 'bigint', nullable: false })
  requirementId: number;

  @Column({
    name: 'item_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ItemStatus.NOT_STARTED,
  })
  itemStatus: ItemStatus;

  @Column({
    name: 'completion_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0.0,
  })
  completionPercentage: number;

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

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ name: 'exemption_reason', type: 'text', nullable: true })
  exemptionReason: string | null;

  @Column({ name: 'evidence_count', type: 'integer', nullable: false, default: 0 })
  evidenceCount: number;

  @Column({ name: 'last_evidence_date', type: 'timestamptz', nullable: true })
  lastEvidenceDate: Date | null;

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

