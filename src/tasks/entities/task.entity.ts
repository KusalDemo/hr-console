import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { TaskDependency } from './task-dependency.entity';

/**
 * Task Status Enum
 */
export enum TaskStatus {
  TODO = 'TODO', // Not started
  IN_PROGRESS = 'IN_PROGRESS', // In progress
  IN_REVIEW = 'IN_REVIEW', // Under review
  BLOCKED = 'BLOCKED', // Blocked by dependency or issue
  COMPLETED = 'COMPLETED', // Completed
  CANCELLED = 'CANCELLED', // Cancelled
}

/**
 * Task Priority Enum
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Task Type Enum
 */
export enum TaskType {
  TASK = 'TASK', // Regular task
  SUBTASK = 'SUBTASK', // Subtask
  BUG = 'BUG', // Bug
  FEATURE = 'FEATURE', // Feature
  EPIC = 'EPIC', // Epic (large task)
  STORY = 'STORY', // User story
}

/**
 * Recurrence Pattern Enum
 */
export enum RecurrencePattern {
  NONE = 'NONE', // No recurrence
  DAILY = 'DAILY', // Daily
  WEEKLY = 'WEEKLY', // Weekly
  MONTHLY = 'MONTHLY', // Monthly
  YEARLY = 'YEARLY', // Yearly
  CUSTOM = 'CUSTOM', // Custom pattern
}

/**
 * Task Entity
 * 
 * Hierarchical task management with:
 * - Parent-child relationships (sub-tasks)
 * - Dependencies (FS, SS, FF, SF)
 * - Assignments (multiple assignees)
 * - Status workflow
 * - Priorities, due dates, estimates vs actuals
 * - Task templates, recurring tasks
 * - Integration with time tracking
 * - Comments and attachments support (via metadata)
 */
@Entity('tasks')
@Index('idx_tasks_project', ['projectId'])
@Index('idx_tasks_parent', ['parentTaskId'])
@Index('idx_tasks_status', ['status'])
@Index('idx_tasks_priority', ['priority'])
@Index('idx_tasks_type', ['taskType'])
@Index('idx_tasks_assignee', ['assigneeId'])
@Index('idx_tasks_due_date', ['dueDate'])
@Index('idx_tasks_template', ['isTemplate'])
@Index('idx_tasks_recurring', ['isRecurring'])
export class Task {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique task key (e.g., TASK-2024-001)
   */
  @Column({ name: 'task_key', type: 'varchar', length: 128, unique: true, nullable: false })
  taskKey: string;

  /**
   * Task title
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  /**
   * Task description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Project this task belongs to
   */
  @ManyToOne(() => Project, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ name: 'project_id', type: 'bigint', nullable: true })
  projectId: number | null;

  /**
   * Parent task (for hierarchical structure - sub-tasks)
   */
  @ManyToOne(() => Task, (task) => task.subTasks, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: Promise<Task | null> | Task | null;

  @Column({ name: 'parent_task_id', type: 'bigint', nullable: true })
  parentTaskId: number | null;

  /**
   * Sub-tasks (child tasks)
   */
  @OneToMany(() => Task, (task) => task.parentTask, {
    cascade: false,
    lazy: true,
  })
  subTasks: Promise<Task[]> | Task[];

  /**
   * Task type
   */
  @Column({
    name: 'task_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TaskType.TASK,
  })
  taskType: TaskType;

  /**
   * Task status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  /**
   * Task priority
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  /**
   * Primary assignee (employee)
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee: Employee | null;

  @Column({ name: 'assignee_id', type: 'bigint', nullable: true })
  assigneeId: number | null;

  /**
   * Reporter (employee who created/reported the task)
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reporter_id' })
  reporter: Employee | null;

  @Column({ name: 'reporter_id', type: 'bigint', nullable: true })
  reporterId: number | null;

  /**
   * Additional assignees (many-to-many)
   */
  @ManyToMany(() => Employee, {
    lazy: true,
  })
  @JoinTable({
    name: 'task_assignees',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employee_id', referencedColumnName: 'id' },
  })
  additionalAssignees: Promise<Employee[]> | Employee[];

  /**
   * Due date
   */
  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  /**
   * Start date
   */
  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  startDate: Date | null;

  /**
   * Actual start date
   */
  @Column({ name: 'actual_start_date', type: 'timestamptz', nullable: true })
  actualStartDate: Date | null;

  /**
   * Completion date
   */
  @Column({ name: 'completion_date', type: 'timestamptz', nullable: true })
  completionDate: Date | null;

  /**
   * Estimated hours
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
   * Actual hours (from time tracking)
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
   * Remaining hours estimate
   */
  @Column({
    name: 'remaining_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  remainingHours: number;

  /**
   * Story points (for agile/scrum)
   */
  @Column({
    name: 'story_points',
    type: 'integer',
    nullable: true,
  })
  storyPoints: number | null;

  /**
   * Whether this is a template task
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Template ID (if this task was created from a template)
   */
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Whether this is a recurring task
   */
  @Column({ name: 'is_recurring', type: 'boolean', nullable: false, default: false })
  isRecurring: boolean;

  /**
   * Recurrence pattern
   */
  @Column({
    name: 'recurrence_pattern',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: RecurrencePattern.NONE,
  })
  recurrencePattern: RecurrencePattern;

  /**
   * Recurrence interval (e.g., every 2 weeks)
   */
  @Column({
    name: 'recurrence_interval',
    type: 'integer',
    nullable: true,
  })
  recurrenceInterval: number | null;

  /**
   * Recurrence end date
   */
  @Column({ name: 'recurrence_end_date', type: 'timestamptz', nullable: true })
  recurrenceEndDate: Date | null;

  /**
   * Next occurrence date (for recurring tasks)
   */
  @Column({ name: 'next_occurrence_date', type: 'timestamptz', nullable: true })
  nextOccurrenceDate: Date | null;

  /**
   * Tags (comma-separated or JSON array)
   */
  @Column({ type: 'text', nullable: true })
  tags: string | null;

  /**
   * Task metadata (JSONB for additional flexible data: comments, attachments, etc.)
   */
  @Column({ name: 'task_metadata', type: 'jsonb', nullable: true })
  taskMetadata: Record<string, any> | null;

  /**
   * Task dependencies (outgoing - tasks this task depends on)
   */
  @OneToMany(() => TaskDependency, (dependency) => dependency.dependentTask, {
    cascade: true,
    lazy: true,
  })
  dependencies: Promise<TaskDependency[]> | TaskDependency[];

  /**
   * Task dependents (incoming - tasks that depend on this task)
   */
  @OneToMany(() => TaskDependency, (dependency) => dependency.dependsOnTask, {
    cascade: false,
    lazy: true,
  })
  dependents: Promise<TaskDependency[]> | TaskDependency[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if task is completed
   */
  isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  /**
   * Check if task is in progress
   */
  isInProgress(): boolean {
    return this.status === TaskStatus.IN_PROGRESS;
  }

  /**
   * Check if task is blocked
   */
  isBlocked(): boolean {
    return this.status === TaskStatus.BLOCKED;
  }

  /**
   * Check if task is overdue
   */
  isOverdue(): boolean {
    if (!this.dueDate || this.isCompleted()) {
      return false;
    }

    return new Date() > new Date(this.dueDate);
  }

  /**
   * Calculate completion percentage
   */
  getCompletionPercentage(): number {
    if (this.estimatedHours === 0) {
      return this.isCompleted() ? 100 : 0;
    }

    const totalHours = this.actualHours + this.remainingHours;
    if (totalHours === 0) {
      return 0;
    }

    return Math.min(100, (this.actualHours / totalHours) * 100);
  }

  /**
   * Calculate hours variance
   */
  getHoursVariance(): number {
    return this.actualHours - this.estimatedHours;
  }

  /**
   * Check if task has sub-tasks
   */
  async hasSubTasks(): Promise<boolean> {
    const subTasks = await this.subTasks;
    return Array.isArray(subTasks) && subTasks.length > 0;
  }
}

