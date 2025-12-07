import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ComplianceRequirement } from './compliance-requirement.entity';

/**
 * Framework Type Enum
 */
export enum FrameworkType {
  REGULATORY = 'REGULATORY',
  CERTIFICATION = 'CERTIFICATION',
  STANDARD = 'STANDARD',
  INDUSTRY = 'INDUSTRY',
}

/**
 * Compliance Level Enum
 */
export enum ComplianceLevel {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Compliance Framework Entity
 * 
 * Different compliance standards (GDPR, HIPAA, SOC2, ISO27001, etc.)
 */
@Entity('compliance_frameworks')
@Index('idx_compliance_frameworks_code', ['frameworkCode'])
@Index('idx_compliance_frameworks_active', ['isActive'])
@Index('idx_compliance_frameworks_enabled', ['isEnabled'])
@Index('idx_compliance_frameworks_type', ['frameworkType'])
export class ComplianceFramework {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'framework_key', type: 'varchar', length: 128, unique: true, nullable: false })
  frameworkKey: string;

  @Column({ name: 'framework_name', type: 'varchar', length: 255, nullable: false })
  frameworkName: string;

  @Column({ name: 'framework_code', type: 'varchar', length: 64, unique: true, nullable: false })
  frameworkCode: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'framework_type', type: 'varchar', length: 64, nullable: false })
  frameworkType: FrameworkType;

  @Column({ name: 'framework_version', type: 'varchar', length: 32, nullable: true })
  frameworkVersion: string | null;

  @Column({ name: 'framework_authority', type: 'varchar', length: 255, nullable: true })
  frameworkAuthority: string | null;

  @Column({ name: 'framework_url', type: 'varchar', length: 512, nullable: true })
  frameworkUrl: string | null;

  @Column({ name: 'applicable_regions', type: 'jsonb', nullable: true })
  applicableRegions: string[] | null;

  @Column({ name: 'applicable_industries', type: 'jsonb', nullable: true })
  applicableIndustries: string[] | null;

  @Column({ type: 'boolean', nullable: false, default: false })
  mandatory: boolean;

  @Column({ name: 'compliance_level', type: 'varchar', length: 32, nullable: true })
  complianceLevel: ComplianceLevel | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: false })
  isEnabled: boolean;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'last_reviewed_at', type: 'timestamptz', nullable: true })
  lastReviewedAt: Date | null;

  @Column({ name: 'next_review_at', type: 'timestamptz', nullable: true })
  nextReviewAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

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

  @OneToMany(() => ComplianceRequirement, (requirement) => requirement.framework, {
    lazy: true,
  })
  requirements: Promise<ComplianceRequirement[]> | ComplianceRequirement[];
}
