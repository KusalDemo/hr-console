import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WorkflowTransition } from '../entities/workflow-transition.entity';

/**
 * Workflow Transition Repository
 */
@Injectable()
export class WorkflowTransitionRepository extends Repository<WorkflowTransition> {
  constructor(private dataSource: DataSource) {
    super(WorkflowTransition, dataSource.createEntityManager());
  }

  /**
   * Find transitions by workflow instance
   */
  async findByInstance(workflowInstanceId: number): Promise<WorkflowTransition[]> {
    return this.find({
      where: {
        workflowInstanceId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find transitions by user
   */
  async findByUser(userId: number): Promise<WorkflowTransition[]> {
    return this.find({
      where: {
        triggeredBy: userId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}


