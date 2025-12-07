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
import { Project } from './project.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Project Team Role Enum
 */
export enum ProjectTeamRole {
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  DEVELOPER = 'DEVELOPER',
  DESIGNER = 'DESIGNER',
  ANALYST = 'ANALYST',
  TESTER = 'TESTER',
  CONSULTANT = 'CONSULTANT',
  CONTRIBUTOR = 'CONTRIBUTOR',
  OBSERVER = 'OBSERVER',
}

/**
 * Project Team Entity
 *
 * Represents team member assignments to projects.
 * Tracks roles, allocation, and dates.
 */
@Entity('project_teams')
@Index('idx_project_teams_project', ['projectId'])
@Index('idx_project_teams_employee', ['employeeId'])
@Index('idx_project_teams_project_employee', ['projectId', 'employeeId'], {
  unique: true,
})
export class ProjectTeam {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Project this team member belongs to
   */
  @ManyToOne(() => Project, (project) => project.teamMembers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id', type: 'bigint', nullable: false })
  projectId: number;

  /**
   * Employee assigned to the project
   */
  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id', type: 'bigint', nullable: false })
  employeeId: number;

  /**
   * Role in the project
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ProjectTeamRole.CONTRIBUTOR,
  })
  role: ProjectTeamRole;

  /**
   * Allocation percentage (0-100)
   * Represents how much of the employee's time is allocated to this project
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 100,
  })
  allocationPercentage: number;

  /**
   * Start date for this assignment
   */
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  /**
   * End date for this assignment
   */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  /**
   * Hourly rate for this assignment (if different from employee's default rate)
   */
  @Column({
    name: 'hourly_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  hourlyRate: number | null;

  /**
   * Whether this assignment is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Assignment metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'assignment_metadata', type: 'jsonb', nullable: true })
  assignmentMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if assignment is currently active
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();

    if (this.startDate && new Date(this.startDate) > now) {
      return false;
    }

    if (this.endDate && new Date(this.endDate) < now) {
      return false;
    }

    return true;
  }
}

