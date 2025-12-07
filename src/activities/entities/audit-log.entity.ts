import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Audit Level Enum
 */
export enum AuditLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Activity Category Enum
 */
export enum ActivityCategory {
  ENTITY = 'ENTITY',
  AUTH = 'AUTH',
  WORKFLOW = 'WORKFLOW',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
}

/**
 * Actor Type Enum
 */
export enum ActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  INTEGRATION = 'INTEGRATION',
}

/**
 * Audit Log Entity
 *
 * Comprehensive audit logging with:
 * - Before/after values for change tracking
 * - Field-level changes
 * - Comprehensive metadata (IP, user agent, session)
 * - Audit level and compliance tags
 * - Retention policies and archival
 * - Configurable audit levels per entity type
 *
 * This entity tracks all system activities, entity lifecycle events,
 * and user actions for compliance and audit purposes.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_actor', ['actorType', 'actorId'])
@Index('idx_audit_logs_target', ['targetType', 'targetId'])
@Index('idx_audit_logs_activity_type', ['activityType'])
@Index('idx_audit_logs_created', ['createdAt'])
@Index('idx_audit_logs_organization', ['organizationId'])
@Index('idx_audit_logs_category', ['activityCategory'])
@Index('idx_audit_logs_audit_level', ['auditLevel'])
@Index('idx_audit_logs_archived', ['isArchived'])
@Index('idx_audit_logs_retention', ['retentionUntil'])
@Index('idx_audit_logs_compliance', ['complianceTags'])
export class AuditLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Activity type (e.g., 'ENTITY_CREATED', 'ENTITY_UPDATED', 'USER_LOGIN', 'APPROVAL')
   */
  @Column({ name: 'activity_type', type: 'varchar', length: 128, nullable: false })
  activityType: string;

  /**
   * Activity category
   */
  @Column({
    name: 'activity_category',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  activityCategory: ActivityCategory | null;

  /**
   * Actor type (USER, SYSTEM, INTEGRATION)
   */
  @Column({ name: 'actor_type', type: 'varchar', length: 64, nullable: false })
  actorType: ActorType;

  /**
   * Actor ID (user ID, system ID, etc.)
   */
  @Column({ name: 'actor_id', type: 'bigint', nullable: true })
  actorId: number | null;

  /**
   * Actor display name
   */
  @Column({ name: 'actor_name', type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  /**
   * Target entity type (e.g., 'Employee', 'Project', 'TimeEntry')
   */
  @Column({ name: 'target_type', type: 'varchar', length: 128, nullable: true })
  targetType: string | null;

  /**
   * Target entity ID
   */
  @Column({ name: 'target_id', type: 'bigint', nullable: true })
  targetId: number | null;

  /**
   * Target entity display name
   */
  @Column({ name: 'target_name', type: 'varchar', length: 255, nullable: true })
  targetName: string | null;

  /**
   * Organization context
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Human-readable description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Before values (JSON)
   * State of entity before the change
   */
  @Column({ name: 'before_values', type: 'jsonb', nullable: true })
  beforeValues: Record<string, any> | null;

  /**
   * After values (JSON)
   * State of entity after the change
   */
  @Column({ name: 'after_values', type: 'jsonb', nullable: true })
  afterValues: Record<string, any> | null;

  /**
   * Field-level changes (JSON)
   * Format: { fieldName: { before: value, after: value } }
   */
  @Column({ name: 'field_changes', type: 'jsonb', nullable: true })
  fieldChanges: Record<string, { before: any; after: any }> | null;

  /**
   * Change summary
   */
  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  /**
   * IP address of the actor
   */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /**
   * User agent string
   */
  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  /**
   * Session identifier
   */
  @Column({ name: 'session_id', type: 'varchar', length: 128, nullable: true })
  sessionId: string | null;

  /**
   * Request identifier for correlation
   */
  @Column({ name: 'request_id', type: 'varchar', length: 128, nullable: true })
  requestId: string | null;

  /**
   * Audit level
   */
  @Column({
    name: 'audit_level',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: AuditLevel.INFO,
  })
  auditLevel: AuditLevel;

  /**
   * Compliance tags (JSON array)
   * Tags for compliance tracking (e.g., ['GDPR', 'HIPAA', 'SOX'])
   */
  @Column({ name: 'compliance_tags', type: 'jsonb', nullable: true })
  complianceTags: string[] | null;

  /**
   * Whether this activity is publicly visible
   */
  @Column({ name: 'is_public', type: 'boolean', nullable: false, default: false })
  isPublic: boolean;

  /**
   * Whether this log is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * Archived at timestamp
   */
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /**
   * Archived by user ID
   */
  @Column({ name: 'archived_by', type: 'bigint', nullable: true })
  archivedBy: number | null;

  /**
   * Retention until timestamp
   * Logs will be eligible for deletion after this date
   */
  @Column({ name: 'retention_until', type: 'timestamptz', nullable: true })
  retentionUntil: Date | null;

  /**
   * Whether this log is immutable (cannot be modified)
   */
  @Column({ name: 'is_immutable', type: 'boolean', nullable: false, default: true })
  isImmutable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  /**
   * Calculate field changes from before and after values
   */
  static calculateFieldChanges(
    before: Record<string, any> | null,
    after: Record<string, any> | null,
  ): Record<string, { before: any; after: any }> | null {
    if (!before && !after) {
      return null;
    }

    const changes: Record<string, { before: any; after: any }> = {};
    const allKeys = new Set([
      ...(before ? Object.keys(before) : []),
      ...(after ? Object.keys(after) : []),
    ]);

    allKeys.forEach((key) => {
      const beforeValue = before?.[key];
      const afterValue = after?.[key];

      // Only include if values are different
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes[key] = {
          before: beforeValue !== undefined ? beforeValue : null,
          after: afterValue !== undefined ? afterValue : null,
        };
      }
    });

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Generate change summary from field changes
   */
  static generateChangeSummary(
    fieldChanges: Record<string, { before: any; after: any }> | null,
  ): string | null {
    if (!fieldChanges || Object.keys(fieldChanges).length === 0) {
      return null;
    }

    const changedFields = Object.keys(fieldChanges);
    if (changedFields.length === 0) {
      return null;
    }

    if (changedFields.length === 1) {
      return `Changed ${changedFields[0]}`;
    }

    return `Changed ${changedFields.length} fields: ${changedFields.join(', ')}`;
  }
}
