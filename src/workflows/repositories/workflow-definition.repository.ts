import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WorkflowDefinition } from '../entities/workflow-definition.entity';

/**
 * Workflow Definition Repository
 */
@Injectable()
export class WorkflowDefinitionRepository extends Repository<WorkflowDefinition> {
  constructor(private dataSource: DataSource) {
    super(WorkflowDefinition, dataSource.createEntityManager());
  }

  /**
   * Find workflow definition by key
   */
  async findByKey(workflowKey: string): Promise<WorkflowDefinition | null> {
    return this.findOne({
      where: {
        workflowKey,
        isActive: true,
      },
    });
  }

  /**
   * Find default workflow for entity type
   */
  async findDefaultForEntityType(entityType: string): Promise<WorkflowDefinition | null> {
    return this.findOne({
      where: {
        entityType,
        isDefault: true,
        isActive: true,
      },
      order: {
        version: 'DESC',
      },
    });
  }

  /**
   * Find workflows by entity type
   */
  async findByEntityType(entityType: string): Promise<WorkflowDefinition[]> {
    return this.find({
      where: {
        entityType,
        isActive: true,
      },
      order: {
        isDefault: 'DESC',
        version: 'DESC',
      },
    });
  }

  /**
   * Find all active workflows
   */
  async findAllActive(): Promise<WorkflowDefinition[]> {
    return this.find({
      where: {
        isActive: true,
      },
      order: {
        entityType: 'ASC',
        workflowKey: 'ASC',
      },
    });
  }

  /**
   * Check if workflow key exists
   */
  async workflowKeyExists(workflowKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('workflow')
      .where('workflow.workflowKey = :workflowKey', { workflowKey });

    if (excludeId) {
      query.andWhere('workflow.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

