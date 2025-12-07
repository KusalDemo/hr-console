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
import { Equipment } from './equipment.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Assignment Status Enum
 */
export enum AssignmentStatus {
  ACTIVE = 'ACTIVE', // Active assignment
  RETURNED = 'RETURNED', // Returned
  LOST = 'LOST', // Lost
  DAMAGED = 'DAMAGED', // Damaged
}

/**
 * Equipment Assignment Entity
 * 
 * Employee equipment assignments with tracking.
 */
@Entity('equipment_assignments')
@Index('idx_equipment_assignments_equipment', ['equipmentId'])
@Index('idx_equipment_assignments_employee', ['employeeId'])
@Index('idx_equipment_assignments_status', ['assignmentStatus'])
@Index('idx_equipment_assignments_active', ['assignmentStatus', 'assignedDate'])
export class EquipmentAssignment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to equipment
   */
  @Column({ name: 'equipment_id', type: 'bigint', nullable: false })
  equipmentId: number;

  /**
   * Equipment relationship
   */
  @ManyToOne(() => Equipment, (equipment) => equipment.assignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * Employee assigned to
   */
  @Column({ name: 'employee_id', type: 'bigint', nullable: false })
  employeeId: number;

  /**
   * Employee relationship
   */
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  /**
   * Assignment status
   */
  @Column({
    name: 'assignment_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: AssignmentStatus.ACTIVE,
  })
  assignmentStatus: AssignmentStatus;

  /**
   * Assigned date
   */
  @Column({ name: 'assigned_date', type: 'date', nullable: false })
  assignedDate: Date;

  /**
   * Expected return date
   */
  @Column({ name: 'expected_return_date', type: 'date', nullable: true })
  expectedReturnDate: Date | null;

  /**
   * Actual return date
   */
  @Column({ name: 'actual_return_date', type: 'date', nullable: true })
  actualReturnDate: Date | null;

  /**
   * Assigned by user ID
   */
  @Column({ name: 'assigned_by_id', type: 'bigint', nullable: true })
  assignedById: number | null;

  /**
   * Returned by user ID
   */
  @Column({ name: 'returned_by_id', type: 'bigint', nullable: true })
  returnedById: number | null;

  /**
   * Assignment notes
   */
  @Column({ name: 'assignment_notes', type: 'text', nullable: true })
  assignmentNotes: string | null;

  /**
   * Return notes
   */
  @Column({ name: 'return_notes', type: 'text', nullable: true })
  returnNotes: string | null;

  /**
   * Condition at assignment
   */
  @Column({ name: 'condition_at_assignment', type: 'varchar', length: 64, nullable: true })
  conditionAtAssignment: string | null;

  /**
   * Condition at return
   */
  @Column({ name: 'condition_at_return', type: 'varchar', length: 64, nullable: true })
  conditionAtReturn: string | null;

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
}
