import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Task } from './task.entity';

/**
 * Dependency Type Enum
 * 
 * FS = Finish-to-Start: Dependent task cannot start until this task finishes
 * SS = Start-to-Start: Dependent task cannot start until this task starts
 * FF = Finish-to-Finish: Dependent task cannot finish until this task finishes
 * SF = Start-to-Finish: Dependent task cannot finish until this task starts
 */
export enum DependencyType {
  FS = 'FS', // Finish-to-Start
  SS = 'SS', // Start-to-Start
  FF = 'FF', // Finish-to-Finish
  SF = 'SF', // Start-to-Finish
}

/**
 * Task Dependency Entity
 * 
 * Represents dependencies between tasks.
 * Supports different dependency types (FS, SS, FF, SF).
 */
@Entity('task_dependencies')
@Index('idx_task_dependencies_dependent', ['dependentTaskId'])
@Index('idx_task_dependencies_depends_on', ['dependsOnTaskId'])
@Index('idx_task_dependencies_type', ['dependencyType'])
@Unique(['dependentTaskId', 'dependsOnTaskId'])
export class TaskDependency {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Task that depends on another task (dependent task)
   */
  @ManyToOne(() => Task, (task) => task.dependencies, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dependent_task_id' })
  dependentTask: Task;

  @Column({ name: 'dependent_task_id', type: 'bigint', nullable: false })
  dependentTaskId: number;

  /**
   * Task that the dependent task depends on (prerequisite task)
   */
  @ManyToOne(() => Task, (task) => task.dependents, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'depends_on_task_id' })
  dependsOnTask: Task;

  @Column({ name: 'depends_on_task_id', type: 'bigint', nullable: false })
  dependsOnTaskId: number;

  /**
   * Dependency type (FS, SS, FF, SF)
   */
  @Column({
    name: 'dependency_type',
    type: 'varchar',
    length: 8,
    nullable: false,
    default: DependencyType.FS,
  })
  dependencyType: DependencyType;

  /**
   * Lag time in hours (delay between dependency completion and task start)
   */
  @Column({
    name: 'lag_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  lagHours: number;

  /**
   * Whether this dependency is hard (required) or soft (preferred)
   */
  @Column({
    name: 'is_hard_dependency',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isHardDependency: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  /**
   * Check if dependency is satisfied based on dependency type
   */
  isSatisfied(dependsOnTask: Task, dependentTask: Task): boolean {
    switch (this.dependencyType) {
      case DependencyType.FS:
        // Finish-to-Start: Dependent task cannot start until this task finishes
        return dependsOnTask.isCompleted();

      case DependencyType.SS:
        // Start-to-Start: Dependent task cannot start until this task starts
        return dependsOnTask.isInProgress() || dependsOnTask.isCompleted();

      case DependencyType.FF:
        // Finish-to-Finish: Dependent task cannot finish until this task finishes
        return dependsOnTask.isCompleted() || !dependentTask.isCompleted();

      case DependencyType.SF:
        // Start-to-Finish: Dependent task cannot finish until this task starts
        return dependsOnTask.isInProgress() || dependsOnTask.isCompleted();

      default:
        return false;
    }
  }
}

