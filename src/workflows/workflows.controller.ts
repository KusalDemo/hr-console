import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkflowService } from './services/workflow.service';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  StartWorkflowDto,
  TransitionWorkflowDto,
  WorkflowDefinitionResponseDto,
  WorkflowInstanceResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Workflows Controller
 * 
 * REST API endpoints for workflow management:
 * - Workflow definitions (CRUD)
 * - Workflow instances (start, transition, cancel)
 * - Workflow approvals
 */
@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * Create a new workflow definition
   * POST /workflows/definitions
   */
  @Post('definitions')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createWorkflowDefinition(
    @Body() createDto: CreateWorkflowDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowService.createWorkflowDefinition(createDto, user.userId);
  }

  /**
   * Get workflow definitions by entity type
   * GET /workflows/definitions/entity/:entityType
   */
  @Get('definitions/entity/:entityType')
  async getWorkflowDefinitionsByEntityType(
    @Param('entityType') entityType: string,
  ): Promise<WorkflowDefinitionResponseDto[]> {
    return this.workflowService.getWorkflowDefinitionsByEntityType(entityType);
  }

  /**
   * Get workflow definition by key
   * GET /workflows/definitions/key/:workflowKey
   */
  @Get('definitions/key/:workflowKey')
  async getWorkflowDefinitionByKey(
    @Param('workflowKey') workflowKey: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowService.getWorkflowDefinitionByKey(workflowKey);
  }

  /**
   * Get workflow definition by ID
   * GET /workflows/definitions/:id
   */
  @Get('definitions/:id')
  async getWorkflowDefinition(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowService.getWorkflowDefinition(id);
  }

  /**
   * Update a workflow definition
   * PUT /workflows/definitions/:id
   */
  @Put('definitions/:id')
  @Roles('ADMIN', 'HR')
  async updateWorkflowDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWorkflowDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowService.updateWorkflowDefinition(id, updateDto, user.userId);
  }

  /**
   * Start a workflow instance
   * POST /workflows/instances
   */
  @Post('instances')
  @HttpCode(HttpStatus.CREATED)
  async startWorkflow(
    @Body() startDto: StartWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.workflowService.startWorkflow(startDto, user.userId);
  }

  /**
   * Get workflow instance by ID
   * GET /workflows/instances/:id
   */
  @Get('instances/:id')
  async getWorkflowInstance(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.workflowService.getWorkflowInstance(id);
  }

  /**
   * Get workflow instance by entity
   * GET /workflows/instances/entity/:entityType/:entityId
   */
  @Get('instances/entity/:entityType/:entityId')
  async getWorkflowInstanceByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ): Promise<WorkflowInstanceResponseDto | null> {
    return this.workflowService.getWorkflowInstanceByEntity(entityType, entityId);
  }

  /**
   * Transition workflow to a new state
   * POST /workflows/instances/:id/transition
   */
  @Post('instances/:id/transition')
  async transitionWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @Body() transitionDto: TransitionWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.workflowService.transitionWorkflow(id, transitionDto, user.userId);
  }

  /**
   * Cancel workflow instance
   * POST /workflows/instances/:id/cancel
   */
  @Post('instances/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelWorkflowInstance(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.workflowService.cancelWorkflowInstance(id, reason, user.userId);
  }
}

