import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';

/**
 * Trigger Type Enum
 */
export enum TriggerType {
  MANUAL = 'MANUAL', // Manually triggered by user
  AUTO = 'AUTO', // Automatically triggered by condition
  TIMEOUT = 'TIMEOUT', // Triggered by timeout/escalation
  SYSTEM = 'SYSTEM', // Triggered by system action
}

/**
 * Workflow Transition Entity
 * 
 * Tracks all state transitions in a workflow instance.
 * Provides audit trail of workflow state changes.
 */
@Entity('workflow_transitions')
@Index('idx_workflow_transitions_instance', ['workflowInstanceId'])
@Index('idx_workflow_transitions_created', ['createdAt'])
export class WorkflowTransition {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Workflow instance this transition belongs to
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
   * Source state
   */
  @Column({ name: 'from_state', type: 'varchar', length: 128, nullable: true })
  fromState: string | null;

  /**
   * Target state
   */
  @Column({ name: 'to_state', type: 'varchar', length: 128, nullable: false })
  toState: string;

  /**
   * Transition name
   */
  @Column({ name: 'transition_name', type: 'varchar', length: 128, nullable: true })
  transitionName: string | null;

  /**
   * User ID who triggered the transition
   */
  @Column({ name: 'triggered_by', type: 'bigint', nullable: true })
  triggeredBy: number | null;

  /**
   * Trigger type
   */
  @Column({
    name: 'trigger_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TriggerType.MANUAL,
  })
  triggerType: TriggerType;

  /**
   * Comments about the transition
   */
  @Column({ type: 'text', nullable: true })
  comments: string | null;

  /**
   * Additional data about the transition (JSON)
   */
  @Column({ name: 'transition_data', type: 'jsonb', nullable: true })
  transitionData: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}

