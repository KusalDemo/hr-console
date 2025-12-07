import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import { WorkflowApproval, ApprovalStatus } from '../entities/workflow-approval.entity';

/**
 * Workflow Approval Repository
 */
@Injectable()
export class WorkflowApprovalRepository extends Repository<WorkflowApproval> {
  constructor(private dataSource: DataSource) {
    super(WorkflowApproval, dataSource.createEntityManager());
  }

  /**
   * Find approvals by workflow instance
   */
  async findByInstance(workflowInstanceId: number): Promise<WorkflowApproval[]> {
    return this.find({
      where: {
        workflowInstanceId,
      },
      order: {
        approvalStep: 'ASC',
        approvalLevel: 'ASC',
      },
    });
  }

  /**
   * Find approvals by approver
   */
  async findByApprover(approverId: number, status?: ApprovalStatus): Promise<WorkflowApproval[]> {
    const where: any = {
      approverId,
    };

    if (status) {
      where.status = status;
    }

    return this.find({
      where,
      order: {
        assignedAt: 'DESC',
      },
    });
  }

  /**
   * Find pending approvals for a user
   */
  async findPendingApprovals(approverId: number): Promise<WorkflowApproval[]> {
    return this.find({
      where: [
        { approverId, status: ApprovalStatus.PENDING },
        { delegatedTo: approverId, status: ApprovalStatus.PENDING },
      ],
      order: {
        assignedAt: 'ASC',
      },
    });
  }

  /**
   * Find overdue approvals
   */
  async findOverdueApprovals(): Promise<WorkflowApproval[]> {
    const now = new Date();
    return this.find({
      where: {
        status: ApprovalStatus.PENDING,
        dueDate: LessThan(now),
      },
      order: {
        dueDate: 'ASC',
      },
    });
  }

  /**
   * Find pending approvals for workflow instance
   */
  async findPendingByInstance(workflowInstanceId: number): Promise<WorkflowApproval[]> {
    return this.find({
      where: {
        workflowInstanceId,
        status: ApprovalStatus.PENDING,
      },
      order: {
        approvalStep: 'ASC',
        approvalLevel: 'ASC',
      },
    });
  }
}

