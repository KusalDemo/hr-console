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
 * Failed Login Attempt Entity
 *
 * Tracks failed login attempts for account lockout and security monitoring.
 */
@Entity('failed_login_attempts')
@Index('idx_failed_logins_user', ['userId'])
@Index('idx_failed_logins_email', ['email'])
@Index('idx_failed_logins_ip', ['ipAddress'])
@Index('idx_failed_logins_created', ['createdAt'])
export class FailedLoginAttempt {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'CASCADE',
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

  @Column({ name: 'failure_reason', type: 'varchar', length: 128, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}


