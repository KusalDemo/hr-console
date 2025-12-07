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
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Consent Type Enum
 */
export enum ConsentType {
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  FUNCTIONAL = 'FUNCTIONAL',
  NECESSARY = 'NECESSARY',
  THIRD_PARTY = 'THIRD_PARTY',
  DATA_PROCESSING = 'DATA_PROCESSING',
  PROFILING = 'PROFILING',
}

/**
 * Consent Status Enum
 */
export enum ConsentStatus {
  PENDING = 'PENDING',
  GIVEN = 'GIVEN',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

/**
 * Data Subject Type Enum
 */
export enum DataSubjectType {
  USER = 'USER',
  EMPLOYEE = 'EMPLOYEE',
  CANDIDATE = 'CANDIDATE',
  CONTACT = 'CONTACT',
  CUSTOMER = 'CUSTOMER',
  VISITOR = 'VISITOR',
}

/**
 * Consent Entity
 *
 * Consent tracking and management for GDPR compliance.
 */
@Entity('consents')
@Index('idx_consents_subject_id', ['dataSubjectId'])
@Index('idx_consents_subject_email', ['dataSubjectEmail'])
@Index('idx_consents_type', ['consentType'])
@Index('idx_consents_status', ['consentStatus'])
@Index('idx_consents_category', ['consentCategory'])
@Index('idx_consents_given_at', ['givenAt'])
@Index('idx_consents_expires_at', ['expiresAt'])
@Index('idx_consents_organization', ['organizationId'])
export class Consent {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'consent_key', type: 'varchar', length: 128, unique: true, nullable: false })
  consentKey: string;

  // Subject information
  @Column({ name: 'data_subject_id', type: 'bigint', nullable: true })
  dataSubjectId: number | null;

  @Column({ name: 'data_subject_email', type: 'varchar', length: 255, nullable: true })
  dataSubjectEmail: string | null;

  @Column({ name: 'data_subject_type', type: 'varchar', length: 64, nullable: true })
  dataSubjectType: DataSubjectType | null;

  @Column({ name: 'data_subject_identifier', type: 'varchar', length: 255, nullable: true })
  dataSubjectIdentifier: string | null;

  // Consent details
  @Column({ name: 'consent_type', type: 'varchar', length: 64, nullable: false })
  consentType: ConsentType;

  @Column({ name: 'consent_category', type: 'varchar', length: 64, nullable: true })
  consentCategory: string | null;

  @Column({ name: 'consent_purpose', type: 'text', nullable: true })
  consentPurpose: string | null;

  @Column({
    name: 'consent_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ConsentStatus.PENDING,
  })
  consentStatus: ConsentStatus;

  // Consent metadata
  @Column({ name: 'consent_method', type: 'varchar', length: 64, nullable: true })
  consentMethod: string | null;

  @Column({ name: 'consent_source', type: 'varchar', length: 64, nullable: true })
  consentSource: string | null;

  @Column({ name: 'consent_version', type: 'varchar', length: 32, nullable: true })
  consentVersion: string | null;

  @Column({ name: 'privacy_policy_version', type: 'varchar', length: 32, nullable: true })
  privacyPolicyVersion: string | null;

  @Column({ name: 'terms_version', type: 'varchar', length: 32, nullable: true })
  termsVersion: string | null;

  // Dates
  @Column({ name: 'given_at', type: 'timestamptz', nullable: true })
  givenAt: Date | null;

  @Column({ name: 'withdrawn_at', type: 'timestamptz', nullable: true })
  withdrawnAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_verified_at', type: 'timestamptz', nullable: true })
  lastVerifiedAt: Date | null;

  // Verification
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'device_fingerprint', type: 'varchar', length: 128, nullable: true })
  deviceFingerprint: string | null;

  @Column({ name: 'consent_record_hash', type: 'varchar', length: 256, nullable: true })
  consentRecordHash: string | null;

  // Withdrawal
  @Column({ name: 'withdrawal_reason', type: 'text', nullable: true })
  withdrawalReason: string | null;

  @Column({ name: 'withdrawal_method', type: 'varchar', length: 64, nullable: true })
  withdrawalMethod: string | null;

  @Column({ name: 'withdrawal_ip_address', type: 'varchar', length: 45, nullable: true })
  withdrawalIpAddress: string | null;

  @Column({ name: 'withdrawal_user_agent', type: 'varchar', length: 512, nullable: true })
  withdrawalUserAgent: string | null;

  // Scope
  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  @Column({ name: 'is_tenant_wide', type: 'boolean', nullable: false, default: false })
  isTenantWide: boolean;

  // Audit
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

