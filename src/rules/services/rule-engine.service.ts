import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BusinessRuleRepository } from '../repositories/business-rule.repository';
import { RuleExecutionLogRepository } from '../repositories/rule-execution-log.repository';
import { ExpressionEvaluatorService } from './expression-evaluator.service';
import {
  BusinessRule,
  RuleExecutionLog,
  ExecutionStatus,
} from '../entities';
import {
  CreateBusinessRuleDto,
  UpdateBusinessRuleDto,
  ExecuteRuleDto,
  BusinessRuleResponseDto,
  RuleExecutionResultDto,
} from '../dto';

/**
 * Rule Execution Result
 */
export interface RuleExecutionResult {
  ruleKey: string;
  ruleName: string;
  conditionMatched: boolean;
  actionsExecuted: boolean;
  status: string;
  outputData?: Record<string, any>;
  errorMessage?: string;
  executionTimeMs: number;
}

/**
 * Rule Engine Service
 * 
 * Evaluates and executes business rules.
 * Supports JSONPath-like expression evaluation, event-driven rules, and scheduled rules.
 */
@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly businessRuleRepository: BusinessRuleRepository,
    private readonly ruleExecutionLogRepository: RuleExecutionLogRepository,
    private readonly expressionEvaluator: ExpressionEvaluatorService,
  ) {}

  /**
   * Create a new business rule
   */
  async createBusinessRule(
    createDto: CreateBusinessRuleDto,
    createdBy?: number,
  ): Promise<BusinessRuleResponseDto> {
    // Check if rule key already exists
    const exists = await this.businessRuleRepository.ruleKeyExists(createDto.ruleKey);

    if (exists) {
      throw new ConflictException(`Rule key '${createDto.ruleKey}' already exists`);
    }

    // Validate rule structure
    this.validateRule(createDto);

    // Create business rule
    const businessRule = this.businessRuleRepository.create({
      ...createDto,
      isActive: true,
      priority: createDto.priority || 100,
      createdBy,
    });

    const saved = await this.businessRuleRepository.save(businessRule);

    this.logger.log(`Created business rule: ${saved.id} (${saved.ruleKey})`);

    return this.mapToResponse(saved);
  }

  /**
   * Update a business rule
   */
  async updateBusinessRule(
    id: number,
    updateDto: UpdateBusinessRuleDto,
    updatedBy?: number,
  ): Promise<BusinessRuleResponseDto> {
    const businessRule = await this.businessRuleRepository.findOne({
      where: { id },
    });

    if (!businessRule) {
      throw new NotFoundException(`Business rule with ID ${id} not found`);
    }

    // Check rule key uniqueness if changed
    if (updateDto.ruleKey && updateDto.ruleKey !== businessRule.ruleKey) {
      const exists = await this.businessRuleRepository.ruleKeyExists(updateDto.ruleKey, id);

      if (exists) {
        throw new ConflictException(`Rule key '${updateDto.ruleKey}' already exists`);
      }
    }

    // Validate rule structure if provided
    if (updateDto.conditions || updateDto.actions) {
      const mergedDto = { ...businessRule, ...updateDto };
      this.validateRule(mergedDto as CreateBusinessRuleDto);
    }

    // Update business rule
    Object.assign(businessRule, updateDto);
    businessRule.updatedBy = updatedBy;

    const saved = await this.businessRuleRepository.save(businessRule);

    this.logger.log(`Updated business rule: ${saved.id}`);

    return this.mapToResponse(saved);
  }

  /**
   * Get business rule by ID
   */
  async getBusinessRule(id: number): Promise<BusinessRuleResponseDto> {
    const businessRule = await this.businessRuleRepository.findOne({
      where: { id },
    });

    if (!businessRule) {
      throw new NotFoundException(`Business rule with ID ${id} not found`);
    }

    return this.mapToResponse(businessRule);
  }

  /**
   * Get business rule by key
   */
  async getBusinessRuleByKey(ruleKey: string): Promise<BusinessRuleResponseDto> {
    const businessRule = await this.businessRuleRepository.findByKey(ruleKey);

    if (!businessRule) {
      throw new NotFoundException(`Business rule with key '${ruleKey}' not found`);
    }

    return this.mapToResponse(businessRule);
  }

  /**
   * Execute rules for an entity event
   */
  async executeRules(
    executeDto: ExecuteRuleDto,
    triggeredBy?: number,
  ): Promise<RuleExecutionResult[]> {
    const { entityType, entityId, triggerEvent, entityData, organizationId } = executeDto;

    // Find applicable rules
    const applicableRules = await this.businessRuleRepository.findApplicableRules(
      entityType,
      triggerEvent,
      organizationId,
    );

    const results: RuleExecutionResult[] = [];

    for (const rule of applicableRules) {
      // Check if rule should be executed for this trigger event
      if (!this.shouldExecuteForEvent(rule, triggerEvent)) {
        continue;
      }

      // Check if rule is currently active
      if (!rule.isCurrentlyActive()) {
        continue;
      }

      try {
        const result = await this.executeRule(rule, entityType, entityId, triggerEvent, entityData, triggeredBy);
        results.push(result);

        // If rule has stopOnMatch and conditions matched, stop processing
        if (rule.stopOnMatch && result.conditionMatched && result.actionsExecuted) {
          this.logger.log(`Rule ${rule.ruleKey} matched and stopOnMatch=true, stopping rule evaluation`);
          break;
        }
      } catch (error) {
        this.logger.error(`Error executing rule: ruleKey=${rule.ruleKey}`, error);
        const errorResult = this.createErrorResult(rule, entityType, entityId, triggerEvent, error);
        results.push(errorResult);
      }
    }

    return results;
  }

  /**
   * Execute a specific rule
   */
  async executeRule(
    rule: BusinessRule,
    entityType: string,
    entityId: number,
    triggerEvent: string,
    entityData: Record<string, any>,
    triggeredBy?: number,
  ): Promise<RuleExecutionResult> {
    const startTime = Date.now();

    const logEntry = this.ruleExecutionLogRepository.create({
      businessRuleId: rule.id,
      entityType,
      entityId,
      triggerEvent,
      triggeredBy,
      inputData: entityData,
    });

    try {
      // Evaluate conditions
      const conditionResult = this.expressionEvaluator.evaluateConditions(rule.conditions, entityData);
      logEntry.conditionResult = conditionResult;

      const result: RuleExecutionResult = {
        ruleKey: rule.ruleKey,
        ruleName: rule.ruleName,
        conditionMatched: conditionResult,
        actionsExecuted: false,
        status: 'CONDITION_NOT_MET',
        executionTimeMs: 0,
      };

      if (!conditionResult) {
        // Conditions didn't match, skip actions
        logEntry.executionStatus = ExecutionStatus.CONDITION_NOT_MET;
        logEntry.actionsExecuted = false;
        result.actionsExecuted = false;
        result.status = 'CONDITION_NOT_MET';
      } else {
        // Conditions matched, execute actions
        const actionOutput = await this.executeActions(rule.actions, entityData, rule, entityType, entityId);
        logEntry.actionsExecuted = true;
        logEntry.outputData = actionOutput;
        logEntry.executionStatus = ExecutionStatus.SUCCESS;

        result.actionsExecuted = true;
        result.outputData = actionOutput;
        result.status = 'SUCCESS';
      }

      const executionTime = Date.now() - startTime;
      logEntry.executionTimeMs = executionTime;
      result.executionTimeMs = executionTime;

      await this.ruleExecutionLogRepository.save(logEntry);

      this.logger.debug(
        `Rule executed: ruleKey=${rule.ruleKey}, conditionMatched=${conditionResult}, actionsExecuted=${result.actionsExecuted}, time=${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logEntry.executionTimeMs = executionTime;
      logEntry.executionStatus = ExecutionStatus.FAILED;
      logEntry.errorMessage = error instanceof Error ? error.message : String(error);
      logEntry.errorStackTrace = error instanceof Error ? error.stack : undefined;

      await this.ruleExecutionLogRepository.save(logEntry);

      this.logger.error(`Rule execution failed: ruleKey=${rule.ruleKey}`, error);

      return {
        ruleKey: rule.ruleKey,
        ruleName: rule.ruleName,
        conditionMatched: false,
        actionsExecuted: false,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
      };
    }
  }

  /**
   * Check if rule should be executed for event
   */
  private shouldExecuteForEvent(rule: BusinessRule, triggerEvent: string): boolean {
    if (!rule.triggerEvents || rule.triggerEvents.length === 0) {
      return true; // No specific events = matches all
    }
    return rule.triggerEvents.includes(triggerEvent);
  }

  /**
   * Execute rule actions
   */
  private async executeActions(
    actions: Record<string, any>,
    entityData: Record<string, any>,
    rule: BusinessRule,
    entityType: string,
    entityId: number,
  ): Promise<Record<string, any>> {
    const output: Record<string, any> = {};

    if (!actions || typeof actions !== 'object') {
      return output;
    }

    // Handle different action types
    if (Array.isArray(actions)) {
      // Array of actions
      for (const action of actions) {
        const actionResult = await this.executeSingleAction(action, entityData, rule, entityType, entityId);
        if (actionResult) {
          Object.assign(output, actionResult);
        }
      }
    } else {
      // Single action object
      const actionResult = await this.executeSingleAction(actions, entityData, rule, entityType, entityId);
      if (actionResult) {
        Object.assign(output, actionResult);
      }
    }

    return output;
  }

  /**
   * Execute a single action
   */
  private async executeSingleAction(
    action: any,
    entityData: Record<string, any>,
    rule: BusinessRule,
    entityType: string,
    entityId: number,
  ): Promise<Record<string, any> | null> {
    if (!action || !action.type) {
      return null;
    }

    const actionType = action.type.toUpperCase();

    switch (actionType) {
      case 'SET_FIELD':
        // Set a field value (for transformation rules)
        if (action.field && action.value !== undefined) {
          this.setFieldValue(entityData, action.field, action.value);
          return { [action.field]: action.value };
        }
        break;

      case 'VALIDATE':
        // Validation action (throw error if validation fails)
        if (action.message) {
          throw new BadRequestException(action.message);
        }
        break;

      case 'NOTIFY':
        // Notification action (structure for future notification service integration)
        this.logger.log(`Notification action: ${action.message || 'No message'}`);
        return { notified: true };

      case 'LOG':
        // Logging action
        this.logger.log(`Rule log: ${action.message || JSON.stringify(action)}`);
        return { logged: true };

      case 'CALCULATE':
        // Calculation action (evaluate expression)
        if (action.expression && action.targetField) {
          const result = this.evaluateExpression(action.expression, entityData);
          this.setFieldValue(entityData, action.targetField, result);
          return { [action.targetField]: result };
        }
        break;

      default:
        this.logger.warn(`Unknown action type: ${actionType}`);
    }

    return null;
  }

  /**
   * Set field value in data (supports nested paths)
   */
  private setFieldValue(data: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current: any = data;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Get value from path (helper method)
   */
  private getValueFromPath(data: Record<string, any>, path: string): any {
    if (!path) {
      return null;
    }

    const parts = path.split('.');
    let value: any = data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * Evaluate expression (simple expression evaluation)
   */
  private evaluateExpression(expression: string, data: Record<string, any>): any {
    // Simple expression evaluation - can be enhanced with a proper expression parser
    // For now, support basic field references like ${field.name}
    let result = expression;

    const fieldRegex = /\$\{([^}]+)\}/g;
    result = result.replace(fieldRegex, (match, fieldPath) => {
      const value = this.getValueFromPath(data, fieldPath);
      return value !== null && value !== undefined ? String(value) : '';
    });

    // Try to evaluate as JavaScript expression (be careful with security)
    try {
      // eslint-disable-next-line no-eval
      return eval(result);
    } catch (error) {
      return result;
    }
  }

  /**
   * Create error result
   */
  private createErrorResult(
    rule: BusinessRule,
    entityType: string,
    entityId: number,
    triggerEvent: string,
    error: any,
  ): RuleExecutionResult {
    return {
      ruleKey: rule.ruleKey,
      ruleName: rule.ruleName,
      conditionMatched: false,
      actionsExecuted: false,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      executionTimeMs: 0,
    };
  }

  /**
   * Validate rule structure
   */
  private validateRule(rule: CreateBusinessRuleDto): void {
    if (!rule.conditions) {
      throw new BadRequestException('Rule must have conditions');
    }

    if (!rule.actions) {
      throw new BadRequestException('Rule must have actions');
    }
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponse(rule: BusinessRule): BusinessRuleResponseDto {
    return {
      id: rule.id,
      ruleKey: rule.ruleKey,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      entityType: rule.entityType,
      triggerType: rule.triggerType,
      triggerEvents: rule.triggerEvents,
      conditions: rule.conditions,
      actions: rule.actions,
      priority: rule.priority,
      isActive: rule.isActive,
      activationDate: rule.activationDate,
      expirationDate: rule.expirationDate,
      organizationId: rule.organizationId,
      tenantScope: rule.tenantScope,
      executionMode: rule.executionMode,
      stopOnMatch: rule.stopOnMatch,
      description: rule.description,
      metadata: rule.metadata,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      createdBy: rule.createdBy,
      updatedBy: rule.updatedBy,
    };
  }
}

