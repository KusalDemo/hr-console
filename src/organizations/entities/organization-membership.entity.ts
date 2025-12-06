import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from './organization.entity';

/**
 * Organization Membership Entity - Represents user-organization relationships
 * 
 * This entity tracks:
 * - Which users belong to which organizations
 * - User's role within each organization
 * - Primary organization flag (one per user)
 * - Join and leave timestamps
 * 
 * Users can belong to multiple organizations, but only one can be marked as primary.
 * When a user leaves an organization, the left_at timestamp is set (soft delete).
 */
@Entity('organization_memberships')
@Index('idx_org_memberships_user', ['user'])
@Index('idx_org_memberships_org', ['organizationId'])
@Index('idx_org_memberships_primary', ['isPrimary'], { where: 'is_primary = true' })
@Index('idx_org_memberships_active', ['leftAt'], { where: 'left_at IS NULL' })
export class OrganizationMembership {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * User who is a member of the organization
   */
  @ManyToOne(() => User, (user) => user.organizationMemberships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId: number;

  /**
   * Organization the user belongs to
   * Note: Using organizationId as column for now since Organization entity
   * doesn't have a direct relationship back to memberships
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * User's role within this organization
   * Examples: ADMIN, HR, MANAGER, EMPLOYEE, etc.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  role: string | null;

  /**
   * Primary organization flag
   * Only one organization per user should be marked as primary
   * This is the user's default organization
   */
  @Column({ name: 'is_primary', type: 'boolean', default: false, nullable: false })
  isPrimary: boolean;

  /**
   * Timestamp when user joined the organization
   */
  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz', nullable: false })
  joinedAt: Date;

  /**
   * Timestamp when user left the organization
   * NULL means the user is still a member (active membership)
   */
  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Check if membership is active (user hasn't left)
   */
  isActive(): boolean {
    return this.leftAt === null;
  }

  /**
   * Check if membership is inactive (user has left)
   */
  isInactive(): boolean {
    return this.leftAt !== null;
  }

  /**
   * Get membership duration in days
   * Returns null if membership is still active
   */
  getDurationInDays(): number | null {
    if (!this.leftAt) {
      return null; // Still active
    }

    const durationMs = this.leftAt.getTime() - this.joinedAt.getTime();
    return Math.floor(durationMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get active membership duration in days
   * Returns the number of days since joining (if still active)
   */
  getActiveDurationInDays(): number {
    const endDate = this.leftAt || new Date();
    const durationMs = endDate.getTime() - this.joinedAt.getTime();
    return Math.floor(durationMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Mark membership as inactive (user left)
   */
  markAsInactive(): void {
    if (!this.leftAt) {
      this.leftAt = new Date();
    }
  }

  /**
   * Reactivate membership (user rejoined)
   */
  reactivate(): void {
    this.leftAt = null;
  }

  /**
   * Set as primary organization
   * Note: This method doesn't unset other primary memberships
   * That should be handled by the service layer
   */
  setAsPrimary(): void {
    this.isPrimary = true;
  }

  /**
   * Unset as primary organization
   */
  unsetAsPrimary(): void {
    this.isPrimary = false;
  }
}

