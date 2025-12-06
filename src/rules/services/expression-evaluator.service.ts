import { Injectable, Logger } from '@nestjs/common';

/**
 * Expression Evaluator Service
 * 
 * Evaluates JSONPath-like expressions for rule conditions.
 * Supports field path access, operators, and logical operations.
 */
@Injectable()
export class ExpressionEvaluatorService {
  private readonly logger = new Logger(ExpressionEvaluatorService.name);

  /**
   * Evaluate conditions using JSONPath-like expressions
   */
  evaluateConditions(conditions: any, data: Record<string, any>): boolean {
    if (!conditions) {
      return true; // No conditions = always true
    }

    try {
      // Handle different condition structures
      if (Array.isArray(conditions)) {
        return this.evaluateConditionArray(conditions, data);
      } else if (typeof conditions === 'object') {
        return this.evaluateCondition(conditions, data);
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to evaluate conditions: ${JSON.stringify(conditions)}`, error);
      return false;
    }
  }

  /**
   * Evaluate an array of conditions with AND/OR logic
   */
  private evaluateConditionArray(conditions: any[], data: Record<string, any>): boolean {
    let logic = 'AND'; // Default to AND

    for (const condition of conditions) {
      if (condition.logic) {
        logic = condition.logic.toUpperCase();
        continue;
      }

      const result = this.evaluateCondition(condition, data);

      if (logic === 'OR' && result) {
        return true; // OR: any match succeeds
      }
      if (logic === 'AND' && !result) {
        return false; // AND: any failure fails
      }
    }

    return logic === 'AND'; // AND: all passed, OR: none passed
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: any, data: Record<string, any>): boolean {
    const field = condition.field;
    const operator = condition.operator;
    const expectedValue = condition.value;

    if (!field || !operator) {
      return false;
    }

    // Get value from data using field path
    const actualValue = this.getValueFromPath(data, field);

    // Evaluate based on operator
    return this.evaluateOperator(operator, actualValue, expectedValue);
  }

  /**
   * Get value from data using field path (supports nested paths like "user.name")
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
   * Evaluate operator comparison
   */
  private evaluateOperator(operator: string, actualValue: any, expectedValue: any): boolean {
    if (actualValue === null || actualValue === undefined) {
      return operator === 'IS_NULL' || operator === 'NOT_EXISTS' || operator === 'IS_EMPTY';
    }

    const operatorUpper = operator.toUpperCase();

    switch (operatorUpper) {
      case 'EQUALS':
      case '==':
        return this.compareValues(actualValue, expectedValue) === 0;

      case 'NOT_EQUALS':
      case '!=':
        return this.compareValues(actualValue, expectedValue) !== 0;

      case 'GREATER_THAN':
      case '>':
        return this.compareValues(actualValue, expectedValue) > 0;

      case 'GREATER_THAN_OR_EQUAL':
      case '>=':
        return this.compareValues(actualValue, expectedValue) >= 0;

      case 'LESS_THAN':
      case '<':
        return this.compareValues(actualValue, expectedValue) < 0;

      case 'LESS_THAN_OR_EQUAL':
      case '<=':
        return this.compareValues(actualValue, expectedValue) <= 0;

      case 'CONTAINS':
        return String(actualValue).includes(String(expectedValue));

      case 'NOT_CONTAINS':
        return !String(actualValue).includes(String(expectedValue));

      case 'STARTS_WITH':
        return String(actualValue).startsWith(String(expectedValue));

      case 'ENDS_WITH':
        return String(actualValue).endsWith(String(expectedValue));

      case 'IN':
        if (Array.isArray(expectedValue)) {
          return expectedValue.some((val) => this.compareValues(actualValue, val) === 0);
        }
        return false;

      case 'NOT_IN':
        if (Array.isArray(expectedValue)) {
          return !expectedValue.some((val) => this.compareValues(actualValue, val) === 0);
        }
        return true;

      case 'IS_NULL':
      case 'IS_EMPTY':
        return actualValue === null || actualValue === undefined || actualValue === '';

      case 'IS_NOT_NULL':
      case 'IS_NOT_EMPTY':
        return actualValue !== null && actualValue !== undefined && actualValue !== '';

      case 'REGEX':
      case 'MATCHES':
        try {
          const regex = new RegExp(String(expectedValue));
          return regex.test(String(actualValue));
        } catch (error) {
          this.logger.warn(`Invalid regex pattern: ${expectedValue}`);
          return false;
        }

      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Compare two values
   */
  private compareValues(a: any, b: any): number {
    // Try numeric comparison first
    const numA = Number(a);
    const numB = Number(b);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // String comparison
    const strA = String(a);
    const strB = String(b);

    if (strA < strB) {
      return -1;
    }
    if (strA > strB) {
      return 1;
    }
    return 0;
  }
}

