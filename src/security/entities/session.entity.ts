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
import { User } from '../../users/entities/user.entity';

/**
 * Device Type Enum
 */
export enum DeviceType {
  MOBILE = 'MOBILE',
  DESKTOP = 'DESKTOP',
  TABLET = 'TABLET',
  OTHER = 'OTHER',
}

/**
 * Session Entity
 * 
 * Active session management with device tracking.
 * Tracks user sessions with IP, device, and location information.
 */
@Entity('user_sessions')
@Index('idx_sessions_user', ['userId'])
@Index('idx_sessions_token', ['sessionToken'])
@Index('idx_sessions_active', ['isActive'])
@Index('idx_sessions_expires', ['expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'session_token', type: 'varchar', length: 512, unique: true, nullable: false })
  sessionToken: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User> | User;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId: number;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'device_fingerprint', type: 'varchar', length: 128, nullable: true })
  deviceFingerprint: string | null;

  @Column({ name: 'device_type', type: 'varchar', length: 32, nullable: true })
  deviceType: DeviceType | null;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  @Column({ name: 'location_country', type: 'varchar', length: 64, nullable: true })
  locationCountry: string | null;

  @Column({ name: 'location_city', type: 'varchar', length: 128, nullable: true })
  locationCity: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'is_trusted', type: 'boolean', nullable: false, default: false })
  isTrusted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @Column({ name: 'last_accessed_at', type: 'timestamptz', nullable: false, default: () => 'now()' })
  lastAccessedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'revoked_by' })
  revokedBy: Promise<User> | User | null;

  @Column({ name: 'revoked_by', type: 'bigint', nullable: true })
  revokedById: number | null;

  @Column({ name: 'revoke_reason', type: 'varchar', length: 255, nullable: true })
  revokeReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
