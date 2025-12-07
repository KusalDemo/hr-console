import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowDefinition } from '../entities/workflow-definition.entity';

/**
 * Workflow State Machine Service
 * 
 * Handles state machine logic for workflow transitions:
 * - State validation
 * - Transition validation
 * - Condition evaluation
 * - Action execution
 */
@Injectable()
export class WorkflowStateMachineService {
  private readonly logger = new Logger(WorkflowStateMachineService.name);

  /**
   * Parse workflow definition JSON
   */
  parseWorkflowDefinition(workflowDefinition: Record<string, any>): Record<string, any> {
    if (typeof workflowDefinition === 'string') {
      try {
        return JSON.parse(workflowDefinition);
      } catch (error) {
        throw new BadRequestException('Invalid workflow definition JSON');
      }
    }
    return workflowDefinition;
  }

  /**
   * Get initial state from workflow definition
   */
  getInitialState(workflowDef: Record<string, any>): string {
    // Check for explicit initialState
    if (workflowDef.initialState) {
      return workflowDef.initialState;
    }

    // Try to get first state from states array
    if (workflowDef.states && Array.isArray(workflowDef.states) && workflowDef.states.length > 0) {
      return workflowDef.states[0].name;
    }

    throw new BadRequestException('No initial state defined in workflow');
  }

  /**
   * Check if state exists in workflow definition
   */
  stateExists(workflowDef: Record<string, any>, stateName: string): boolean {
    if (!workflowDef.states || !Array.isArray(workflowDef.states)) {
      return false;
    }

    return workflowDef.states.some((state: any) => state.name === stateName);
  }

  /**
   * Find transition by name from current state
   */
  findTransition(
    workflowDef: Record<string, any>,
    fromState: string,
    transitionName: string,
  ): Record<string, any> | null {
    if (!workflowDef.transitions || !Array.isArray(workflowDef.transitions)) {
      return null;
    }

    return (
      workflowDef.transitions.find(
        (transition: any) =>
          transition.fromState === fromState && transition.name === transitionName,
      ) || null
    );
  }

  /**
   * Get all available transitions from current state
   */
  getAvailableTransitions(
    workflowDef: Record<string, any>,
    fromState: string,
    instance: WorkflowInstance,
  ): Record<string, any>[] {
    if (!workflowDef.transitions || !Array.isArray(workflowDef.transitions)) {
      return [];
    }

    return workflowDef.transitions
      .filter((transition: any) => {
        // Filter by fromState
        if (transition.fromState !== fromState) {
          return false;
        }

        // Evaluate conditions if present
        if (transition.conditions) {
          return this.evaluateConditions(transition.conditions, instance);
        }

        return true;
      })
      .map((transition: any) => ({
        name: transition.name,
        toState: transition.toState,
        label: transition.label || transition.name,
        conditions: transition.conditions,
      }));
  }

  /**
   * Evaluate conditions for a transition
   */
  evaluateConditions(conditions: any, instance: WorkflowInstance): boolean {
    if (!conditions) {
      return true;
    }

    // Simple condition evaluation
    // Supports: equals, notEquals, greaterThan, lessThan, in, notIn, contains
    if (conditions.operator && conditions.field && conditions.value !== undefined) {
      const fieldValue = this.getFieldValue(instance, conditions.field);
      const conditionValue = conditions.value;

      switch (conditions.operator.toUpperCase()) {
        case 'EQUALS':
          return String(fieldValue) === String(conditionValue);
        case 'NOTEQUALS':
          return String(fieldValue) !== String(conditionValue);
        case 'GREATERTHAN':
          return Number(fieldValue) > Number(conditionValue);
        case 'LESSTHAN':
          return Number(fieldValue) < Number(conditionValue);
        case 'GREATERTHANOREQUAL':
          return Number(fieldValue) >= Number(conditionValue);
        case 'LESSTHANOREQUAL':
          return Number(fieldValue) <= Number(conditionValue);
        case 'IN':
          return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
        case 'NOTIN':
          return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
        case 'CONTAINS':
          return String(fieldValue).includes(String(conditionValue));
        case 'ISNULL':
          return fieldValue === null || fieldValue === undefined;
        case 'ISNOTNULL':
          return fieldValue !== null && fieldValue !== undefined;
        default:
          this.logger.warn(`Unknown condition operator: ${conditions.operator}`);
          return false;
      }
    }

    // Support for AND/OR logic
    if (conditions.and && Array.isArray(conditions.and)) {
      return conditions.and.every((condition: any) => this.evaluateConditions(condition, instance));
    }

    if (conditions.or && Array.isArray(conditions.or)) {
      return conditions.or.some((condition: any) => this.evaluateConditions(condition, instance));
    }

    return true;
  }

  /**
   * Get field value from instance (supports nested paths)
   */
  private getFieldValue(instance: WorkflowInstance, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = instance;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }

      // Check workflowData first
      if (part.startsWith('data.')) {
        const dataKey = part.substring(5);
        value = instance.workflowData?.[dataKey];
      } else if (part === 'currentState') {
        value = instance.currentState;
      } else if (part === 'status') {
        value = instance.status;
      } else if (part === 'entityType') {
        value = instance.entityType;
      } else if (part === 'entityId') {
        value = instance.entityId;
      } else if (instance.workflowData && instance.workflowData[part] !== undefined) {
        value = instance.workflowData[part];
      } else {
        value = (value as any)[part];
      }
    }

    return value;
  }

  /**
   * Check if state is final (terminal state)
   */
  isFinalState(workflowDef: Record<string, any>, stateName: string): boolean {
    if (!workflowDef.states || !Array.isArray(workflowDef.states)) {
      return false;
    }

    const state = workflowDef.states.find((s: any) => s.name === stateName);
    return state?.final === true || state?.type === 'final';
  }

  /**
   * Get state definition
   */
  getStateDefinition(workflowDef: Record<string, any>, stateName: string): Record<string, any> | null {
    if (!workflowDef.states || !Array.isArray(workflowDef.states)) {
      return null;
    }

    return workflowDef.states.find((s: any) => s.name === stateName) || null;
  }
}


