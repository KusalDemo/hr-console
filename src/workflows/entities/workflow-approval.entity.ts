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
import { WorkflowInstance } from './workflow-instance.entity';

/**
 * Approval Status Enum
 */
export enum ApprovalStatus {
  PENDING = 'PENDING', // Waiting for approval
  APPROVED = 'APPROVED', // Approved
  REJECTED = 'REJECTED', // Rejected
  DELEGATED = 'DELEGATED', // Delegated to another user
  ESCALATED = 'ESCALATED', // Escalated due to timeout
  SKIPPED = 'SKIPPED', // Skipped (non-required approval)
}

/**
 * Workflow Approval Entity
 * 
 * Represents a single approval step in a workflow instance.
 * Supports parallel and sequential approvals, delegation, and auto-approval.
 */
@Entity('workflow_approvals')
@Index('idx_workflow_approvals_instance', ['workflowInstanceId'])
@Index('idx_workflow_approvals_approver', ['approverId'])
@Index('idx_workflow_approvals_status', ['status'])
@Index('idx_workflow_approvals_step', ['workflowInstanceId', 'approvalStep', 'approvalLevel'])
export class WorkflowApproval {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Workflow instance this approval belongs to
   */
  @ManyToOne(() => WorkflowInstance, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_instance_id' })
  workflowInstance: WorkflowInstance;

  @Column({ name: 'workflow_instance_id', type: 'bigint', nullable: false })
  workflowInstanceId: number;

  /**
   * Step number in approval chain (1, 2, 3...)
   */
  @Column({ name: 'approval_step', type: 'integer', nullable: false })
  approvalStep: number;

  /**
   * Level in hierarchy (for parallel approvals)
   */
  @Column({ name: 'approval_level', type: 'integer', nullable: false, default: 1 })
  approvalLevel: number;

  /**
   * User ID who should approve
   */
  @Column({ name: 'approver_id', type: 'bigint', nullable: false })
  approverId: number;

  /**
   * User ID if approval was delegated
   */
  @Column({ name: 'delegated_to', type: 'bigint', nullable: true })
  delegatedTo: number | null;

  /**
   * Approval status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  /**
   * Whether this approval is required
   */
  @Column({ name: 'is_required', type: 'boolean', nullable: false, default: true })
  isRequired: boolean;

  /**
   * Whether this was auto-approved
   */
  @Column({ name: 'is_auto_approved', type: 'boolean', nullable: false, default: false })
  isAutoApproved: boolean;

  /**
   * Auto-approval reason
   */
  @Column({ name: 'auto_approval_reason', type: 'varchar', length: 255, nullable: true })
  autoApprovalReason: string | null;

  /**
   * Comments
   */
  @Column({ type: 'text', nullable: true })
  comments: string | null;

  /**
   * When approval was assigned
   */
  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: false, default: () => 'now()' })
  assignedAt: Date;

  /**
   * Deadline for approval
   */
  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  /**
   * When approval was approved
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * When approval was rejected
   */
  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  /**
   * When approval was escalated
   */
  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt: Date | null;

  /**
   * When reminder was sent
   */
  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Check if approval is pending
   */
  isPending(): boolean {
    return this.status === ApprovalStatus.PENDING;
  }

  /**
   * Check if approval is approved
   */
  isApproved(): boolean {
    return this.status === ApprovalStatus.APPROVED;
  }

  /**
   * Check if approval is rejected
   */
  isRejected(): boolean {
    return this.status === ApprovalStatus.REJECTED;
  }

  /**
   * Check if approval is overdue
   */
  isOverdue(): boolean {
    return this.dueDate !== null && this.dueDate < new Date() && this.isPending();
  }
}


