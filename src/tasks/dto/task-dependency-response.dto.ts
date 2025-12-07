import { TaskDependency, DependencyType } from '../entities/task-dependency.entity';

/**
 * Task Dependency Response DTO
 */
export class TaskDependencyResponseDto {
  id: number;
  dependentTaskId: number;
  dependsOnTaskId: number;
  dependencyType: DependencyType;
  lagHours: number;
  isHardDependency: boolean;
  createdAt: Date;
  createdBy: number | null;

  // Relations
  dependentTask?: {
    id: number;
    taskKey: string;
    title: string;
    status: string;
  };
  dependsOnTask?: {
    id: number;
    taskKey: string;
    title: string;
    status: string;
  };

  static fromEntity(
    dependency: TaskDependency,
    includeRelations = false,
  ): TaskDependencyResponseDto {
    const dto = new TaskDependencyResponseDto();
    dto.id = dependency.id;
    dto.dependentTaskId = dependency.dependentTaskId;
    dto.dependsOnTaskId = dependency.dependsOnTaskId;
    dto.dependencyType = dependency.dependencyType;
    dto.lagHours = dependency.lagHours;
    dto.isHardDependency = dependency.isHardDependency;
    dto.createdAt = dependency.createdAt;
    dto.createdBy = dependency.createdBy;

    if (includeRelations) {
      if (dependency.dependentTask) {
        const dependent = dependency.dependentTask as any;
        dto.dependentTask = {
          id: dependent.id,
          taskKey: dependent.taskKey,
          title: dependent.title,
          status: dependent.status,
        };
      }

      if (dependency.dependsOnTask) {
        const dependsOn = dependency.dependsOnTask as any;
        dto.dependsOnTask = {
          id: dependsOn.id,
          taskKey: dependsOn.taskKey,
          title: dependsOn.title,
          status: dependsOn.status,
        };
      }
    }

    return dto;
  }
}

