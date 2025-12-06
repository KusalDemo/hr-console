import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowTransition } from './workflow-transition.entity';
import { WorkflowApproval } from './workflow-approval.entity';

/**
 * Workflow Status Enum
 */
export enum WorkflowStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Workflow Instance Entity
 * 
 * Represents an active workflow execution for a specific entity.
 * Tracks current state, history, pending approvals, and workflow data.
 */
@Entity('workflow_instances')
@Index('idx_workflow_instances_entity', ['entityType', 'entityId'])
@Index('idx_workflow_instances_state', ['currentState'])
@Index('idx_workflow_instances_status', ['status'])
@Index('idx_workflow_instances_workflow', ['workflowDefinitionId'])
@Index('idx_workflow_instances_organization', ['organizationId'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Workflow definition this instance is based on
   */
  @ManyToOne(() => WorkflowDefinition, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'workflow_definition_id' })
  workflowDefinition: WorkflowDefinition;

  @Column({ name: 'workflow_definition_id', type: 'bigint', nullable: false })
  workflowDefinitionId: number;

  /**
   * Type of entity this workflow is for
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: false })
  entityType: string;

  /**
   * ID of the entity instance
   */
  @Column({ name: 'entity_id', type: 'bigint', nullable: false })
  entityId: number;

  /**
   * Current state name
   */
  @Column({ name: 'current_state', type: 'varchar', length: 128, nullable: false })
  currentState: string;

  /**
   * Workflow status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: WorkflowStatus.ACTIVE,
  })
  status: WorkflowStatus;

  /**
   * JSON context data, variables, form data
   */
  @Column({ name: 'workflow_data', type: 'jsonb', nullable: true })
  workflowData: Record<string, any> | null;

  /**
   * Organization ID (for organization-scoped workflows)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * When workflow was started
   */
  @Column({ name: 'started_at', type: 'timestamptz', nullable: false, default: () => 'now()' })
  startedAt: Date;

  /**
   * When workflow was completed
   */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /**
   * User who completed the workflow
   */
  @Column({ name: 'completed_by', type: 'bigint', nullable: true })
  completedBy: number | null;

  /**
   * Reason for completion/cancellation
   */
  @Column({ name: 'completion_reason', type: 'varchar', length: 255, nullable: true })
  completionReason: string | null;

  /**
   * Workflow transitions (history)
   */
  @OneToMany(() => WorkflowTransition, (transition) => transition.workflowInstance, {
    cascade: true,
    lazy: true,
  })
  transitions: Promise<WorkflowTransition[]>;

  /**
   * Workflow approvals
   */
  @OneToMany(() => WorkflowApproval, (approval) => approval.workflowInstance, {
    cascade: true,
    lazy: true,
  })
  approvals: Promise<WorkflowApproval[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if workflow is active
   */
  isActive(): boolean {
    return this.status === WorkflowStatus.ACTIVE;
  }

  /**
   * Check if workflow is completed
   */
  isCompleted(): boolean {
    return this.status === WorkflowStatus.COMPLETED;
  }
}

