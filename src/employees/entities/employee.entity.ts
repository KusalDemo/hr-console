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

/**
 * Employee Type Enum
 */
export enum EmployeeType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACTOR = 'CONTRACTOR',
  INTERN = 'INTERN',
  TEMPORARY = 'TEMPORARY',
  VOLUNTEER = 'VOLUNTEER',
}

/**
 * Employment Status Enum
 */
export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Employee Entity - Represents employees within an organization
 * 
 * Employees belong to organizations and can have:
 * - Department assignment (via departmentId)
 * - Manager relationship (self-referential)
 * - Employment type and status
 * - Personal and contact information
 * - Emergency contact information
 */
@Entity('employees')
@Index('idx_employees_employee_number', ['employeeNumber'])
@Index('idx_employees_email', ['email'])
@Index('idx_employees_organization', ['organizationId'])
@Index('idx_employees_department', ['departmentId'])
@Index('idx_employees_manager', ['managerId'])
@Index('idx_employees_status', ['employmentStatus'])
@Index('idx_employees_active', ['active'])
export class Employee {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * External ID (for integration with external systems)
   */
  @Column({ name: 'external_id', type: 'varchar', length: 128, nullable: true })
  externalId: string | null;

  /**
   * Unique employee number
   */
  @Column({ name: 'employee_number', type: 'varchar', length: 64, unique: true, nullable: true })
  employeeNumber: string | null;

  /**
   * First name
   */
  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: false })
  firstName: string;

  /**
   * Last name
   */
  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: false })
  lastName: string;

  /**
   * Email address (unique)
   */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  /**
   * Employee type
   */
  @Column({
    name: 'employee_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: EmployeeType.FULL_TIME,
  })
  employeeType: EmployeeType;

  /**
   * Employment status
   */
  @Column({
    name: 'employment_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: EmploymentStatus.ACTIVE,
  })
  employmentStatus: EmploymentStatus;

  /**
   * Hire date
   */
  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date | null;

  /**
   * Termination date
   */
  @Column({ name: 'termination_date', type: 'date', nullable: true })
  terminationDate: Date | null;

  /**
   * Termination reason
   */
  @Column({ name: 'termination_reason', type: 'varchar', length: 255, nullable: true })
  terminationReason: string | null;

  /**
   * Cost center ID (reference to cost center - to be implemented)
   */
  @Column({ name: 'cost_center_id', type: 'bigint', nullable: true })
  costCenterId: number | null;

  /**
   * Department ID (reference to department - to be implemented in commit 79)
   */
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Manager ID (self-referential - manager is also an employee)
   */
  @Column({ name: 'manager_id', type: 'bigint', nullable: true })
  managerId: number | null;

  /**
   * Job title
   */
  @Column({ name: 'job_title', type: 'varchar', length: 255, nullable: true })
  jobTitle: string | null;

  /**
   * Phone number
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  /**
   * Mobile number
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  mobile: string | null;

  /**
   * Address line 1
   */
  @Column({ name: 'address_line1', type: 'varchar', length: 255, nullable: true })
  addressLine1: string | null;

  /**
   * Address line 2
   */
  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  /**
   * City
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  /**
   * State/Province
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  state: string | null;

  /**
   * Postal code
   */
  @Column({ name: 'postal_code', type: 'varchar', length: 32, nullable: true })
  postalCode: string | null;

  /**
   * Country
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  country: string | null;

  /**
   * Date of birth
   */
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  /**
   * Gender
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  gender: string | null;

  /**
   * National ID
   */
  @Column({ name: 'national_id', type: 'varchar', length: 128, nullable: true })
  nationalId: string | null;

  /**
   * Tax ID
   */
  @Column({ name: 'tax_id', type: 'varchar', length: 128, nullable: true })
  taxId: string | null;

  /**
   * Emergency contact name
   */
  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 255, nullable: true })
  emergencyContactName: string | null;

  /**
   * Emergency contact phone
   */
  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 32, nullable: true })
  emergencyContactPhone: string | null;

  /**
   * Emergency contact relationship
   */
  @Column({ name: 'emergency_contact_relation', type: 'varchar', length: 64, nullable: true })
  emergencyContactRelation: string | null;

  /**
   * Profile metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'profile_metadata', type: 'jsonb', nullable: true })
  profileMetadata: Record<string, any> | null;

  /**
   * Whether employee is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  active: boolean;

  /**
   * Organization this employee belongs to
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Get full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Check if employee is active
   */
  isActive(): boolean {
    return this.active && this.employmentStatus === EmploymentStatus.ACTIVE;
  }

  /**
   * Check if employee is terminated
   */
  isTerminated(): boolean {
    return this.employmentStatus === EmploymentStatus.TERMINATED || this.terminationDate !== null;
  }

  /**
   * Check if employee is on leave
   */
  isOnLeave(): boolean {
    return this.employmentStatus === EmploymentStatus.ON_LEAVE;
  }

  /**
   * Get years of service (if hire date is available)
   */
  getYearsOfService(): number | null {
    if (!this.hireDate) {
      return null;
    }

    const now = new Date();
    const hireDate = new Date(this.hireDate);
    const diffTime = now.getTime() - hireDate.getTime();
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    return Math.floor(diffYears);
  }
}

