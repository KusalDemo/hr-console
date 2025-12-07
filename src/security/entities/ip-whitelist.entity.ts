import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

/**
 * IP Whitelist Entity
 *
 * IP filtering/whitelisting for access control.
 * Supports tenant-wide, organization-specific, and user-specific whitelisting.
 */
@Entity('ip_whitelist')
@Index('idx_ip_whitelist_ip', ['ipAddress'])
@Index('idx_ip_whitelist_active', ['isActive'])
@Index('idx_ip_whitelist_org', ['organizationId'])
@Index('idx_ip_whitelist_user', ['userId'])
export class IpWhitelist {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: false })
  ipAddress: string;

  @Column({ name: 'ip_range_start', type: 'varchar', length: 45, nullable: true })
  ipRangeStart: string | null;

  @Column({ name: 'ip_range_end', type: 'varchar', length: 45, nullable: true })
  ipRangeEnd: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User> | User | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'created_by' })
  createdBy: Promise<User> | User | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdById: number | null;
}

