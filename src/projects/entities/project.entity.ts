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
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { Organization } from '../../organizations/entities/organization.entity';
import { ProjectPhase } from './project-phase.entity';
import { ProjectTeam } from './project-team.entity';

/**
 * Project Status Enum
 */
export enum ProjectStatus {
  PLANNING = 'PLANNING', // Planning phase
  ACTIVE = 'ACTIVE', // Active project
  ON_HOLD = 'ON_HOLD', // On hold
  COMPLETED = 'COMPLETED', // Completed
  CANCELLED = 'CANCELLED', // Cancelled
  ARCHIVED = 'ARCHIVED', // Archived
}

/**
 * Project Priority Enum
 */
export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Project Health Indicator Enum
 */
export enum ProjectHealth {
  HEALTHY = 'HEALTHY', // On track
  AT_RISK = 'AT_RISK', // At risk
  OVER_BUDGET = 'OVER_BUDGET', // Over budget
  BEHIND_SCHEDULE = 'BEHIND_SCHEDULE', // Behind schedule
  CRITICAL = 'CRITICAL', // Critical issues
}

registerEnumType(ProjectStatus, { name: 'ProjectStatus' });
registerEnumType(ProjectPriority, { name: 'ProjectPriority' });
registerEnumType(ProjectHealth, { name: 'ProjectHealth' });

/**
 * Project Entity
 *
 * Comprehensive project tracking with:
 * - Budgets and financial tracking
 * - Hierarchical structure (parent-child projects)
 * - Status workflow
 * - Phases
 * - Health indicators
 * - Time/cost estimates
 * - Integration with time tracking and task management
 */
@ObjectType()
@Entity('projects')
@Index('idx_projects_key', ['projectKey'])
@Index('idx_projects_organization', ['organizationId'])
@Index('idx_projects_status', ['status'])
@Index('idx_projects_parent', ['parentProjectId'])
@Index('idx_projects_template', ['isTemplate'])
@Index('idx_projects_archived', ['isArchived'])
@Index('idx_projects_health', ['health'])
export class Project {
  @Field(() => Int)
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique project key (e.g., PROJ-2024-001)
   */
  @Field(() => String)
  @Column({ name: 'project_key', type: 'varchar', length: 128, unique: true, nullable: false })
  projectKey: string;

  /**
   * Project name
   */
  @Field(() => String)
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Project description
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Organization this project belongs to
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Field(() => Int)
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Parent project (for hierarchical structure)
   */
  @ManyToOne(() => Project, (project) => project.childProjects, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'parent_project_id' })
  parentProject: Promise<Project | null> | Project | null;

  @Column({ name: 'parent_project_id', type: 'bigint', nullable: true })
  parentProjectId: number | null;

  /**
   * Child projects (sub-projects)
   */
  @OneToMany(() => Project, (project) => project.parentProject, {
    cascade: false,
    lazy: true,
  })
  childProjects: Promise<Project[]> | Project[];

  /**
   * Project status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  /**
   * Project priority
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  /**
   * Project health indicator
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ProjectHealth.HEALTHY,
  })
  health: ProjectHealth;

  /**
   * Project start date
   */
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  /**
   * Project end date (planned)
   */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  /**
   * Actual completion date
   */
  @Column({ name: 'actual_completion_date', type: 'date', nullable: true })
  actualCompletionDate: Date | null;

  /**
   * Project manager ID (employee ID)
   */
  @Column({ name: 'project_manager_id', type: 'bigint', nullable: true })
  projectManagerId: number | null;

  /**
   * Client ID (reference to client/contact - to be implemented in Commit 15)
   */
  @Column({ name: 'client_id', type: 'bigint', nullable: true })
  clientId: number | null;

  /**
   * Budgeted amount
   */
  @Column({
    name: 'budgeted_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  budgetedAmount: number;

  /**
   * Actual cost amount
   */
  @Column({
    name: 'actual_cost_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  actualCostAmount: number;

  /**
   * Budgeted hours
   */
  @Column({
    name: 'budgeted_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  budgetedHours: number;

  /**
   * Actual hours
   */
  @Column({
    name: 'actual_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  actualHours: number;

  /**
   * Estimated hours (remaining)
   */
  @Column({
    name: 'estimated_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  estimatedHours: number;

  /**
   * Budgeted revenue
   */
  @Column({
    name: 'budgeted_revenue',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  budgetedRevenue: number;

  /**
   * Actual revenue
   */
  @Column({
    name: 'actual_revenue',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  actualRevenue: number;

  /**
   * Whether this is a template project
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Template ID (if this project was created from a template)
   */
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Whether project is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * When project was archived
   */
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /**
   * User who archived the project
   */
  @Column({ name: 'archived_by', type: 'bigint', nullable: true })
  archivedBy: number | null;

  /**
   * Project metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'project_metadata', type: 'jsonb', nullable: true })
  projectMetadata: Record<string, any> | null;

  /**
   * Project phases
   */
  @OneToMany(() => ProjectPhase, (phase) => phase.project, {
    cascade: true,
    lazy: true,
  })
  phases: Promise<ProjectPhase[]> | ProjectPhase[];

  /**
   * Project team members
   */
  @OneToMany(() => ProjectTeam, (team) => team.project, {
    cascade: true,
    lazy: true,
  })
  teamMembers: Promise<ProjectTeam[]> | ProjectTeam[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if project is active
   */
  isActive(): boolean {
    return this.status === ProjectStatus.ACTIVE && !this.isArchived;
  }

  /**
   * Check if project is completed
   */
  isCompleted(): boolean {
    return this.status === ProjectStatus.COMPLETED;
  }

  /**
   * Check if project is on budget
   */
  isOnBudget(): boolean {
    return this.actualCostAmount <= this.budgetedAmount;
  }

  /**
   * Check if project is on schedule
   */
  isOnSchedule(): boolean {
    if (!this.endDate) {
      return true; // No end date means no schedule constraint
    }

    const now = new Date();
    const endDate = new Date(this.endDate);

    return now <= endDate || this.actualCompletionDate !== null;
  }

  /**
   * Calculate budget variance
   */
  getBudgetVariance(): number {
    return this.actualCostAmount - this.budgetedAmount;
  }

  /**
   * Calculate budget variance percentage
   */
  getBudgetVariancePercentage(): number {
    if (this.budgetedAmount === 0) {
      return 0;
    }

    return ((this.actualCostAmount - this.budgetedAmount) / this.budgetedAmount) * 100;
  }

  /**
   * Calculate hours variance
   */
  getHoursVariance(): number {
    return this.actualHours - this.budgetedHours;
  }

  /**
   * Calculate completion percentage (based on hours)
   */
  getCompletionPercentage(): number {
    if (this.budgetedHours === 0) {
      return 0;
    }

    const totalHours = this.actualHours + this.estimatedHours;
    return Math.min(100, (this.actualHours / totalHours) * 100);
  }
}
