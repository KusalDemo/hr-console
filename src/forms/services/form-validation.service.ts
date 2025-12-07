import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';

/**
 * Form Validation Service
 * 
 * Validates form schemas and form responses:
 * - Form schema validation
 * - Response data validation against schema
 * - Conditional logic validation
 * - Field validation rules
 */
@Injectable()
export class FormValidationService {
  private readonly logger = new Logger(FormValidationService.name);

  /**
   * Validate form schema structure
   */
  validateFormSchema(schema: Record<string, any>): void {
    if (!schema || typeof schema !== 'object') {
      throw new BadRequestException('Form schema must be an object');
    }

    if (!schema.fields || !Array.isArray(schema.fields)) {
      throw new BadRequestException('Form schema must have a fields array');
    }

    if (schema.fields.length === 0) {
      throw new BadRequestException('Form schema must have at least one field');
    }

    // Validate each field
    schema.fields.forEach((field: any, index: number) => {
      this.validateField(field, index);
    });

    // Validate conditional logic if present
    if (schema.conditionalLogic) {
      this.validateConditionalLogic(schema.conditionalLogic, schema.fields);
    }
  }

  /**
   * Validate field structure
   */
  private validateField(field: any, index: number): void {
    if (!field.id || typeof field.id !== 'string') {
      throw new BadRequestException(
        `Field at index ${index} must have a valid id (string)`,
      );
    }

    if (!field.type || typeof field.type !== 'string') {
      throw new BadRequestException(
        `Field at index ${index} must have a valid type (string)`,
      );
    }

    if (!field.label || typeof field.label !== 'string') {
      throw new BadRequestException(
        `Field at index ${index} must have a valid label (string)`,
      );
    }

    // Validate field type
    const validFieldTypes = [
      'text',
      'textarea',
      'email',
      'number',
      'date',
      'datetime',
      'time',
      'select',
      'multiselect',
      'radio',
      'checkbox',
      'file',
      'rating',
      'signature',
    ];

    if (!validFieldTypes.includes(field.type)) {
      throw new BadRequestException(
        `Field at index ${index} has invalid type: ${field.type}`,
      );
    }

    // Validate options for select/radio/checkbox types
    if (['select', 'multiselect', 'radio', 'checkbox'].includes(field.type)) {
      if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
        throw new BadRequestException(
          `Field at index ${index} (${field.type}) must have options array`,
        );
      }
    }

    // Validate validation rules if present
    if (field.validation) {
      this.validateFieldValidation(field.validation, index);
    }
  }

  /**
   * Validate field validation rules
   */
  private validateFieldValidation(validation: any, fieldIndex: number): void {
    if (typeof validation !== 'object') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation must be an object`,
      );
    }

    // Validate required
    if (validation.required !== undefined && typeof validation.required !== 'boolean') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation.required must be a boolean`,
      );
    }

    // Validate min/max length
    if (validation.minLength !== undefined && typeof validation.minLength !== 'number') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation.minLength must be a number`,
      );
    }

    if (validation.maxLength !== undefined && typeof validation.maxLength !== 'number') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation.maxLength must be a number`,
      );
    }

    // Validate min/max value
    if (validation.min !== undefined && typeof validation.min !== 'number') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation.min must be a number`,
      );
    }

    if (validation.max !== undefined && typeof validation.max !== 'number') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation.max must be a number`,
      );
    }

    // Validate pattern (regex)
    if (validation.pattern !== undefined && typeof validation.pattern !== 'string') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation.pattern must be a string`,
      );
    }

    // Validate custom validation function (if present)
    if (validation.custom !== undefined && typeof validation.custom !== 'string') {
      throw new BadRequestException(
        `Field at index ${fieldIndex} validation.custom must be a string`,
      );
    }
  }

  /**
   * Validate conditional logic
   */
  private validateConditionalLogic(
    conditionalLogic: any,
    fields: any[],
  ): void {
    if (!Array.isArray(conditionalLogic)) {
      throw new BadRequestException('Conditional logic must be an array');
    }

    const fieldIds = fields.map((f) => f.id);

    conditionalLogic.forEach((rule: any, index: number) => {
      if (!rule.fieldId || !fieldIds.includes(rule.fieldId)) {
        throw new BadRequestException(
          `Conditional logic rule at index ${index} references invalid fieldId`,
        );
      }

      if (!rule.operator || typeof rule.operator !== 'string') {
        throw new BadRequestException(
          `Conditional logic rule at index ${index} must have a valid operator`,
        );
      }

      const validOperators = ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan'];
      if (!validOperators.includes(rule.operator)) {
        throw new BadRequestException(
          `Conditional logic rule at index ${index} has invalid operator: ${rule.operator}`,
        );
      }

      if (rule.value === undefined) {
        throw new BadRequestException(
          `Conditional logic rule at index ${index} must have a value`,
        );
      }

      if (rule.showFields && !Array.isArray(rule.showFields)) {
        throw new BadRequestException(
          `Conditional logic rule at index ${index} showFields must be an array`,
        );
      }

      if (rule.hideFields && !Array.isArray(rule.hideFields)) {
        throw new BadRequestException(
          `Conditional logic rule at index ${index} hideFields must be an array`,
        );
      }
    });
  }

  /**
   * Validate response data against form schema
   */
  validateResponseData(
    formSchema: Record<string, any>,
    responseData: Record<string, any>,
  ): void {
    if (!responseData || typeof responseData !== 'object') {
      throw new BadRequestException('Response data must be an object');
    }

    const fields = formSchema.fields || [];

    // Validate each field in schema
    fields.forEach((field: any) => {
      const fieldValue = responseData[field.id];

      // Check required fields
      if (field.validation?.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        throw new BadRequestException(`Field ${field.label || field.id} is required`);
      }

      // Skip validation if field is empty and not required
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        return;
      }

      // Type-specific validation
      this.validateFieldValue(field, fieldValue);
    });

    // Validate conditional logic
    if (formSchema.conditionalLogic) {
      this.validateConditionalLogicExecution(
        formSchema.conditionalLogic,
        responseData,
      );
    }
  }

  /**
   * Validate field value
   */
  private validateFieldValue(field: any, value: any): void {
    const validation = field.validation || {};

    // Type validation
    switch (field.type) {
      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          throw new BadRequestException(
            `Field ${field.label || field.id} must be a valid email`,
          );
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          throw new BadRequestException(
            `Field ${field.label || field.id} must be a number`,
          );
        }
        break;

      case 'date':
      case 'datetime':
      case 'time':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          throw new BadRequestException(
            `Field ${field.label || field.id} must be a valid date`,
          );
        }
        break;

      case 'select':
      case 'radio':
        if (!field.options.some((opt: any) => opt.value === value)) {
          throw new BadRequestException(
            `Field ${field.label || field.id} has invalid option value`,
          );
        }
        break;

      case 'multiselect':
      case 'checkbox':
        if (!Array.isArray(value)) {
          throw new BadRequestException(
            `Field ${field.label || field.id} must be an array`,
          );
        }
        const validValues = field.options.map((opt: any) => opt.value);
        if (!value.every((v) => validValues.includes(v))) {
          throw new BadRequestException(
            `Field ${field.label || field.id} has invalid option values`,
          );
        }
        break;
    }

    // Length validation
    if (validation.minLength && String(value).length < validation.minLength) {
      throw new BadRequestException(
        `Field ${field.label || field.id} must be at least ${validation.minLength} characters`,
      );
    }

    if (validation.maxLength && String(value).length > validation.maxLength) {
      throw new BadRequestException(
        `Field ${field.label || field.id} must be at most ${validation.maxLength} characters`,
      );
    }

    // Value range validation
    if (validation.min !== undefined && Number(value) < validation.min) {
      throw new BadRequestException(
        `Field ${field.label || field.id} must be at least ${validation.min}`,
      );
    }

    if (validation.max !== undefined && Number(value) > validation.max) {
      throw new BadRequestException(
        `Field ${field.label || field.id} must be at most ${validation.max}`,
      );
    }

    // Pattern validation
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(String(value))) {
        throw new BadRequestException(
          `Field ${field.label || field.id} does not match required pattern`,
        );
      }
    }
  }

  /**
   * Validate conditional logic execution
   */
  private validateConditionalLogicExecution(
    conditionalLogic: any[],
    responseData: Record<string, any>,
  ): void {
    // This is a basic validation - in a real implementation,
    // you would evaluate the conditional logic and ensure
    // that shown/hidden fields are properly handled
    conditionalLogic.forEach((rule: any) => {
      const fieldValue = responseData[rule.fieldId];

      if (fieldValue !== undefined && fieldValue !== null) {
        // Evaluate condition (simplified)
        const conditionMet = this.evaluateCondition(
          fieldValue,
          rule.operator,
          rule.value,
        );

        if (conditionMet && rule.requiredFields) {
          // Check if required fields are present
          rule.requiredFields.forEach((requiredFieldId: string) => {
            if (!responseData[requiredFieldId]) {
              throw new BadRequestException(
                `Field ${requiredFieldId} is required based on conditional logic`,
              );
            }
          });
        }
      }
    });
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'notEquals':
        return value !== expectedValue;
      case 'contains':
        return String(value).includes(String(expectedValue));
      case 'greaterThan':
        return Number(value) > Number(expectedValue);
      case 'lessThan':
        return Number(value) < Number(expectedValue);
      default:
        return false;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
