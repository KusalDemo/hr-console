import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Team } from './team.entity';

/**
 * Department Type Enum
 */
export enum DepartmentType {
  STANDARD = 'STANDARD',
  COST_CENTER = 'COST_CENTER',
  PROFIT_CENTER = 'PROFIT_CENTER',
  DIVISION = 'DIVISION',
  UNIT = 'UNIT',
}

/**
 * Department Status Enum
 */
export enum DepartmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Department Entity - Represents departments within an organization
 *
 * Departments support:
 * - Hierarchical structure (parent-child relationships)
 * - Organization relationship
 * - Manager assignment (employee)
 * - Budget and headcount management
 * - Multiple department types (standard, cost center, profit center, etc.)
 *
 * Departments can have child departments and teams.
 */
@Entity('departments')
@Index('idx_departments_org', ['organizationId'])
@Index('idx_departments_key', ['organizationId', 'departmentKey'])
@Index('idx_departments_parent', ['parentDepartmentId'])
@Index('idx_departments_manager', ['managerId'])
@Index('idx_departments_status', ['status'])
export class Department {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Organization this department belongs to
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
   * Unique department key within organization
   */
  @Column({ name: 'department_key', type: 'varchar', length: 128, nullable: false })
  departmentKey: string;

  /**
   * Department name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Display name (optional, for UI display)
   */
  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  /**
   * Department description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Parent department for hierarchy support
   */
  @ManyToOne(() => Department, (dept) => dept.childDepartments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_department_id' })
  parentDepartment: Department | null;

  @Column({ name: 'parent_department_id', type: 'bigint', nullable: true })
  parentDepartmentId: number | null;

  /**
   * Child departments
   */
  @OneToMany(() => Department, (dept) => dept.parentDepartment, {
    cascade: false,
    lazy: true,
  })
  childDepartments: Promise<Department[]>;

  /**
   * Teams within this department
   */
  @OneToMany(() => Team, (team) => team.department, {
    cascade: false,
    lazy: true,
  })
  teams: Promise<Team[]>;

  /**
   * Department type
   */
  @Column({
    name: 'department_type',
    type: 'varchar',
    length: 64,
    nullable: false,
    default: DepartmentType.STANDARD,
  })
  departmentType: DepartmentType;

  /**
   * Cost center code
   */
  @Column({ name: 'cost_center_code', type: 'varchar', length: 64, nullable: true })
  costCenterCode: string | null;

  /**
   * Department status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: DepartmentStatus.ACTIVE,
  })
  status: DepartmentStatus;

  /**
   * Department manager (employee)
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'manager_id' })
  manager: Employee | null;

  @Column({ name: 'manager_id', type: 'bigint', nullable: true })
  managerId: number | null;

  /**
   * Headcount limit (maximum number of employees)
   */
  @Column({ name: 'headcount_limit', type: 'integer', nullable: true })
  headcountLimit: number | null;

  /**
   * Budget allocated
   */
  @Column({ name: 'budget_allocated', type: 'decimal', precision: 15, scale: 2, nullable: true })
  budgetAllocated: number | null;

  /**
   * Budget period (MONTHLY, QUARTERLY, YEARLY)
   */
  @Column({ name: 'budget_period', type: 'varchar', length: 32, nullable: true })
  budgetPeriod: string | null;

  /**
   * Department location
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
   * Check if department is active
   */
  isActive(): boolean {
    return this.status === DepartmentStatus.ACTIVE;
  }

  /**
   * Check if department has a parent
   */
  hasParent(): boolean {
    return this.parentDepartmentId !== null;
  }

  /**
   * Check if department has children
   */
  async hasChildren(): Promise<boolean> {
    const children = await this.childDepartments;
    return children.length > 0;
  }

  /**
   * Get all ancestor departments (parent, grandparent, etc.)
   */
  async getAncestors(): Promise<Department[]> {
    const ancestors: Department[] = [];
    let current: Department | null = this.parentDepartment;

    while (current) {
      ancestors.push(current);
      current = current.parentDepartment;
    }

    return ancestors;
  }

  /**
   * Get all descendant departments (children, grandchildren, etc.)
   */
  async getDescendants(): Promise<Department[]> {
    const descendants: Department[] = [];
    const children = await this.childDepartments;

    for (const child of children) {
      descendants.push(child);
      const childDescendants = await child.getDescendants();
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Get full department path (e.g., "Parent > Child > Grandchild")
   */
  async getFullPath(): Promise<string> {
    const ancestors = await this.getAncestors();
    const path = [...ancestors.reverse(), this];
    return path.map((dept) => dept.name).join(' > ');
  }
}
