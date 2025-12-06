import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';

/**
 * Workflow Definition Entity
 * 
 * Defines the states, transitions, and rules for a workflow.
 * Supports approval chains, parallel approvals, delegation, and auto-approval.
 * 
 * The workflowDefinition field contains JSON with:
 * - states: Array of state definitions
 * - initialState: Initial state name
 * - transitions: Array of transition definitions
 * - conditions: Conditional logic
 * - actions: Actions to execute on transitions
 */
@Entity('workflow_definitions')
@Index('idx_workflow_def_key', ['workflowKey'], { unique: true })
@Index('idx_workflow_def_entity_type', ['entityType'])
@Index('idx_workflow_def_active', ['isActive'])
@Index('idx_workflow_def_default', ['entityType', 'isDefault', 'isActive'])
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique workflow key (e.g., "time_off_approval", "project_approval")
   */
  @Column({ name: 'workflow_key', type: 'varchar', length: 128, unique: true, nullable: false })
  workflowKey: string;

  /**
   * Display name for the workflow
   */
  @Column({ name: 'workflow_name', type: 'varchar', length: 255, nullable: false })
  workflowName: string;

  /**
   * Entity type this workflow applies to (e.g., "TimeOffRequest", "Project")
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: false })
  entityType: string;

  /**
   * Workflow description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * JSON workflow definition: states, transitions, conditions, actions
   */
  @Column({ name: 'workflow_definition', type: 'jsonb', nullable: false })
  workflowDefinition: Record<string, any>;

  /**
   * Version number (for versioning workflows)
   */
  @Column({ type: 'integer', nullable: false, default: 1 })
  version: number;

  /**
   * Whether this is the default workflow for the entity type
   */
  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  /**
   * Whether workflow is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Organization ID (for organization-scoped workflows)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Additional metadata
   */
  @Column({ name: 'workflow_metadata', type: 'jsonb', nullable: true })
  workflowMetadata: Record<string, any> | null;

  /**
   * Workflow instances using this definition
   */
  @OneToMany(() => WorkflowInstance, (instance) => instance.workflowDefinition, {
    cascade: false,
    lazy: true,
  })
  instances: Promise<WorkflowInstance[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}

