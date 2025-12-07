import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RuleExecutionLog, ExecutionStatus } from '../entities/rule-execution-log.entity';

/**
 * Rule Execution Log Repository
 */
@Injectable()
export class RuleExecutionLogRepository extends Repository<RuleExecutionLog> {
  constructor(private dataSource: DataSource) {
    super(RuleExecutionLog, dataSource.createEntityManager());
  }

  /**
   * Find logs by rule
   */
  async findByRule(ruleId: number): Promise<RuleExecutionLog[]> {
    return this.find({
      where: {
        businessRuleId: ruleId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find logs by entity
   */
  async findByEntity(entityType: string, entityId: number): Promise<RuleExecutionLog[]> {
    return this.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find logs by status
   */
  async findByStatus(status: ExecutionStatus): Promise<RuleExecutionLog[]> {
    return this.find({
      where: {
        executionStatus: status,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find failed executions
   */
  async findFailedExecutions(): Promise<RuleExecutionLog[]> {
    return this.find({
      where: [
        { executionStatus: ExecutionStatus.FAILED },
        { executionStatus: ExecutionStatus.ERROR },
      ],
      order: {
        createdAt: 'DESC',
      },
    });
  }
}

