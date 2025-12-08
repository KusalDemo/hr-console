import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WorkflowInstance, WorkflowStatus } from '../entities/workflow-instance.entity';

/**
 * Workflow Instance Repository
 */
@Injectable()
export class WorkflowInstanceRepository extends Repository<WorkflowInstance> {
  constructor(private dataSource: DataSource) {
    super(WorkflowInstance, dataSource.createEntityManager());
  }

  /**
   * Find workflow instance by entity
   */
  async findByEntity(
    entityType: string,
    entityId: number,
    includeRelations = false,
  ): Promise<WorkflowInstance | null> {
    const query = this.createQueryBuilder('instance')
      .where('instance.entityType = :entityType', { entityType })
      .andWhere('instance.entityId = :entityId', { entityId })
      .andWhere('instance.status = :status', { status: WorkflowStatus.ACTIVE });

    if (includeRelations) {
      query
        .leftJoinAndSelect('instance.workflowDefinition', 'workflowDefinition')
        .leftJoinAndSelect('instance.transitions', 'transitions')
        .leftJoinAndSelect('instance.approvals', 'approvals');
    }

    return query.getOne();
  }

  /**
   * Find workflow instance by ID
   */
  async findById(id: number, includeRelations = false): Promise<WorkflowInstance | null> {
    const query = this.createQueryBuilder('instance').where('instance.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('instance.workflowDefinition', 'workflowDefinition')
        .leftJoinAndSelect('instance.transitions', 'transitions')
        .leftJoinAndSelect('instance.approvals', 'approvals');
    }

    return query.getOne();
  }

  /**
   * Find active workflow instances
   */
  async findActiveInstances(
    entityType?: string,
    organizationId?: number,
  ): Promise<WorkflowInstance[]> {
    const query = this.createQueryBuilder('instance')
      .where('instance.status = :status', { status: WorkflowStatus.ACTIVE })
      .leftJoinAndSelect('instance.workflowDefinition', 'workflowDefinition');

    if (entityType) {
      query.andWhere('instance.entityType = :entityType', { entityType });
    }

    if (organizationId) {
      query.andWhere('instance.organizationId = :organizationId', { organizationId });
    }

    return query.orderBy('instance.startedAt', 'DESC').getMany();
  }

  /**
   * Find workflow instances by workflow definition
   */
  async findByWorkflowDefinition(
    workflowDefinitionId: number,
    status?: WorkflowStatus,
  ): Promise<WorkflowInstance[]> {
    const query = this.createQueryBuilder('instance')
      .where('instance.workflowDefinitionId = :workflowDefinitionId', { workflowDefinitionId })
      .leftJoinAndSelect('instance.workflowDefinition', 'workflowDefinition');

    if (status) {
      query.andWhere('instance.status = :status', { status });
    }

    return query.orderBy('instance.startedAt', 'DESC').getMany();
  }
}


