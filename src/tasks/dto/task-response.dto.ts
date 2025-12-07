import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  RecurrencePattern,
} from '../entities/task.entity';
import { TaskDependencyResponseDto } from './task-dependency-response.dto';

/**
 * Task Response DTO
 */
export class TaskResponseDto {
  id: number;
  taskKey: string;
  title: string;
  description: string | null;
  projectId: number | null;
  parentTaskId: number | null;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  reporterId: number | null;
  dueDate: Date | null;
  startDate: Date | null;
  actualStartDate: Date | null;
  completionDate: Date | null;
  estimatedHours: number;
  actualHours: number;
  remainingHours: number;
  storyPoints: number | null;
  isTemplate: boolean;
  templateId: number | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number | null;
  recurrenceEndDate: Date | null;
  nextOccurrenceDate: Date | null;
  tags: string | null;
  taskMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Relations
  assignee?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  reporter?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  additionalAssignees?: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  project?: {
    id: number;
    projectKey: string;
    name: string;
  };
  parentTask?: {
    id: number;
    taskKey: string;
    title: string;
  };
  subTasks?: TaskResponseDto[];
  dependencies?: TaskDependencyResponseDto[];

  // Computed fields
  completionPercentage?: number;
  hoursVariance?: number;
  isOverdue?: boolean;
  isCompleted?: boolean;
  isInProgress?: boolean;
  isBlocked?: boolean;

  static fromEntity(task: Task, includeRelations = false): TaskResponseDto {
    const dto = new TaskResponseDto();
    dto.id = task.id;
    dto.taskKey = task.taskKey;
    dto.title = task.title;
    dto.description = task.description;
    dto.projectId = task.projectId;
    dto.parentTaskId = task.parentTaskId;
    dto.taskType = task.taskType;
    dto.status = task.status;
    dto.priority = task.priority;
    dto.assigneeId = task.assigneeId;
    dto.reporterId = task.reporterId;
    dto.dueDate = task.dueDate;
    dto.startDate = task.startDate;
    dto.actualStartDate = task.actualStartDate;
    dto.completionDate = task.completionDate;
    dto.estimatedHours = task.estimatedHours;
    dto.actualHours = task.actualHours;
    dto.remainingHours = task.remainingHours;
    dto.storyPoints = task.storyPoints;
    dto.isTemplate = task.isTemplate;
    dto.templateId = task.templateId;
    dto.isRecurring = task.isRecurring;
    dto.recurrencePattern = task.recurrencePattern;
    dto.recurrenceInterval = task.recurrenceInterval;
    dto.recurrenceEndDate = task.recurrenceEndDate;
    dto.nextOccurrenceDate = task.nextOccurrenceDate;
    dto.tags = task.tags;
    dto.taskMetadata = task.taskMetadata;
    dto.createdAt = task.createdAt;
    dto.updatedAt = task.updatedAt;
    dto.createdBy = task.createdBy;
    dto.updatedBy = task.updatedBy;

    // Computed fields
    dto.completionPercentage = task.getCompletionPercentage();
    dto.hoursVariance = task.getHoursVariance();
    dto.isOverdue = task.isOverdue();
    dto.isCompleted = task.isCompleted();
    dto.isInProgress = task.isInProgress();
    dto.isBlocked = task.isBlocked();

    if (includeRelations) {
      if (task.assignee) {
        const assignee = task.assignee as any;
        dto.assignee = {
          id: assignee.id,
          firstName: assignee.firstName,
          lastName: assignee.lastName,
          email: assignee.email,
        };
      }

      if (task.reporter) {
        const reporter = task.reporter as any;
        dto.reporter = {
          id: reporter.id,
          firstName: reporter.firstName,
          lastName: reporter.lastName,
          email: reporter.email,
        };
      }

      if (task.additionalAssignees && Array.isArray(task.additionalAssignees)) {
        dto.additionalAssignees = task.additionalAssignees.map((emp: any) => ({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
        }));
      }

      if (task.project) {
        const project = task.project as any;
        dto.project = {
          id: project.id,
          projectKey: project.projectKey,
          name: project.name,
        };
      }

      if (task.parentTask) {
        const parent = task.parentTask as any;
        dto.parentTask = {
          id: parent.id,
          taskKey: parent.taskKey,
          title: parent.title,
        };
      }

      if (task.subTasks && Array.isArray(task.subTasks)) {
        dto.subTasks = task.subTasks.map((subTask) => TaskResponseDto.fromEntity(subTask, false));
      }

      if (task.dependencies && Array.isArray(task.dependencies)) {
        dto.dependencies = task.dependencies.map((dep) =>
          TaskDependencyResponseDto.fromEntity(dep, true),
        );
      }
    }

    return dto;
  }
}

