import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Audit Type Enum
 */
export enum AuditType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  IP_BLOCKED = 'IP_BLOCKED',
  IP_WHITELISTED = 'IP_WHITELISTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * Action Status Enum
 */
export enum ActionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DENIED = 'DENIED',
}

/**
 * Risk Level Enum
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Security Audit Log Entity
 *
 * Security-specific audit logging for compliance and monitoring.
 */
@Entity('security_audit_logs')
@Index('idx_security_audit_type', ['auditType'])
@Index('idx_security_audit_user', ['userId'])
@Index('idx_security_audit_status', ['actionStatus'])
@Index('idx_security_audit_risk', ['riskLevel'])
@Index('idx_security_audit_created', ['createdAt'])
export class SecurityAuditLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'audit_type', type: 'varchar', length: 64, nullable: false })
  auditType: AuditType;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User> | User | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  action: string | null;

  @Column({ name: 'action_status', type: 'varchar', length: 32, nullable: true })
  actionStatus: ActionStatus | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ name: 'risk_level', type: 'varchar', length: 32, nullable: true })
  riskLevel: RiskLevel | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}


