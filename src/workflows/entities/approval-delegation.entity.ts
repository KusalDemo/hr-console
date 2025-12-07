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
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Approval Delegation Entity
 *
 * Tracks delegation of approval authority with:
 * - Delegation rules (who can delegate to whom)
 * - Effective date ranges
 * - Workflow/entity type scoping
 * - Automatic delegation rules
 * - Delegation scope (departments, amount thresholds, etc.)
 */
@Entity('approval_delegations')
@Index('idx_approval_delegations_delegator', ['delegatorId'])
@Index('idx_approval_delegations_delegate', ['delegateId'])
@Index('idx_approval_delegations_active', ['isActive', 'effectiveStartDate', 'effectiveEndDate'])
@Index('idx_approval_delegations_workflow', ['workflowKey'])
@Index('idx_approval_delegations_entity_type', ['entityType'])
export class ApprovalDelegation {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Employee who is delegating approval authority
   */
  @Column({ name: 'delegator_id', type: 'bigint', nullable: false })
  delegatorId: number;

  /**
   * Delegator relationship
   */
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delegator_id' })
  delegator: Employee;

  /**
   * Employee who receives delegated approval authority
   */
  @Column({ name: 'delegate_id', type: 'bigint', nullable: false })
  delegateId: number;

  /**
   * Delegate relationship
   */
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delegate_id' })
  delegate: Employee;

  /**
   * Specific workflow key (null = all workflows)
   */
  @Column({ name: 'workflow_key', type: 'varchar', length: 128, nullable: true })
  workflowKey: string | null;

  /**
   * Specific entity type (null = all entity types)
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: true })
  entityType: string | null;

  /**
   * When delegation starts
   */
  @Column({ name: 'effective_start_date', type: 'date', nullable: false })
  effectiveStartDate: Date;

  /**
   * When delegation ends (null = no end date)
   */
  @Column({ name: 'effective_end_date', type: 'date', nullable: true })
  effectiveEndDate: Date | null;

  /**
   * Scope of delegation (JSONB)
   * Example: {
   *   "departments": [1, 2, 3],
   *   "amountThreshold": 1000,
   *   "durationThreshold": 5,
   *   "approvalLevels": [1, 2]
   * }
   */
  @Column({ name: 'delegation_scope', type: 'jsonb', nullable: true })
  delegationScope: Record<string, any> | null;

  /**
   * Whether delegation is currently active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether delegation is automatic (e.g., out of office)
   */
  @Column({ name: 'is_automatic', type: 'boolean', nullable: false, default: false })
  isAutomatic: boolean;

  /**
   * Rules for automatic delegation (JSONB)
   * Example: {
   *   "trigger": "OUT_OF_OFFICE",
   *   "conditions": { "status": "AWAY" }
   * }
   */
  @Column({ name: 'auto_delegation_rule', type: 'jsonb', nullable: true })
  autoDelegationRule: Record<string, any> | null;

  /**
   * Additional notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if delegation is currently active
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();
    const startDate = new Date(this.effectiveStartDate);

    if (now < startDate) {
      return false;
    }

    if (this.effectiveEndDate) {
      const endDate = new Date(this.effectiveEndDate);
      if (now > endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if delegation applies to a workflow
   */
  appliesToWorkflow(workflowKey: string): boolean {
    return this.workflowKey === null || this.workflowKey === workflowKey;
  }

  /**
   * Check if delegation applies to an entity type
   */
  appliesToEntityType(entityType: string): boolean {
    return this.entityType === null || this.entityType === entityType;
  }
}
