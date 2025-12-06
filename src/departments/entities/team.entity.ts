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
import { Department } from './department.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Team Status Enum
 */
export enum TeamStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Team Entity - Represents teams within departments or organizations
 * 
 * Teams are smaller groups that can:
 * - Belong to a department (optional - can be cross-departmental)
 * - Belong to an organization
 * - Have a team lead (employee)
 * - Have team members (via employee-team relationship - to be implemented)
 * 
 * Teams are more flexible than departments and can span multiple departments.
 */
@Entity('teams')
@Index('idx_teams_org', ['organizationId'])
@Index('idx_teams_key', ['organizationId', 'teamKey'])
@Index('idx_teams_department', ['departmentId'])
@Index('idx_teams_lead', ['teamLeadId'])
@Index('idx_teams_status', ['status'])
export class Team {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Organization this team belongs to
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Department this team belongs to (optional - can be cross-departmental)
   */
  @ManyToOne(() => Department, (dept) => dept.teams, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Unique team key within organization
   */
  @Column({ name: 'team_key', type: 'varchar', length: 128, nullable: false })
  teamKey: string;

  /**
   * Team name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Display name (optional, for UI display)
   */
  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  /**
   * Team description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Team status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TeamStatus.ACTIVE,
  })
  status: TeamStatus;

  /**
   * Team lead (employee)
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'team_lead_id' })
  teamLead: Employee | null;

  @Column({ name: 'team_lead_id', type: 'bigint', nullable: true })
  teamLeadId: number | null;

  /**
   * Team size limit (maximum number of members)
   */
  @Column({ name: 'size_limit', type: 'integer', nullable: true })
  sizeLimit: number | null;

  /**
   * Team location
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if team is active
   */
  isActive(): boolean {
    return this.status === TeamStatus.ACTIVE;
  }

  /**
   * Check if team belongs to a department
   */
  belongsToDepartment(): boolean {
    return this.departmentId !== null;
  }

  /**
   * Check if team is cross-departmental
   */
  isCrossDepartmental(): boolean {
    return this.departmentId === null;
  }
}

