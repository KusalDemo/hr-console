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
 * Policy Type Enum
 */
export enum PolicyType {
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  COOKIE_POLICY = 'COOKIE_POLICY',
  DATA_PROCESSING_AGREEMENT = 'DATA_PROCESSING_AGREEMENT',
}

/**
 * Privacy Policy Acceptance Entity
 *
 * Tracks privacy policy and terms acceptance.
 */
@Entity('privacy_policy_acceptances')
@Index('idx_privacy_policy_user', ['userId'])
@Index('idx_privacy_policy_type', ['policyType'])
@Index('idx_privacy_policy_version', ['policyVersion'])
@Index('idx_privacy_policy_accepted', ['acceptedAt'])
export class PrivacyPolicyAcceptance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User> | User;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId: number;

  @Column({ name: 'policy_type', type: 'varchar', length: 64, nullable: false })
  policyType: PolicyType;

  @Column({ name: 'policy_version', type: 'varchar', length: 32, nullable: false })
  policyVersion: string;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: false, default: () => 'now()' })
  acceptedAt: Date;

  @Column({ name: 'accepted_via', type: 'varchar', length: 64, nullable: true })
  acceptedVia: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'acceptance_hash', type: 'varchar', length: 256, nullable: true })
  acceptanceHash: string | null;

  // Withdrawal
  @Column({ name: 'withdrawn_at', type: 'timestamptz', nullable: true })
  withdrawnAt: Date | null;

  @Column({ name: 'withdrawal_reason', type: 'text', nullable: true })
  withdrawalReason: string | null;

  // Metadata
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

