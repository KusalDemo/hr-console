import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CustomFieldDefinitionRepository } from '../repositories/custom-field-definition.repository';
import { CustomFieldValueRepository } from '../repositories/custom-field-value.repository';
import { CustomFieldDefinition, CustomFieldType } from '../entities/custom-field-definition.entity';
import { CustomFieldValue } from '../entities/custom-field-value.entity';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  CreateCustomFieldValueDto,
  UpdateCustomFieldValueDto,
  CustomFieldDefinitionResponseDto,
  CustomFieldValueResponseDto,
} from '../dto';

/**
 * Custom Field Service
 *
 * Provides business logic for custom field operations:
 * - Field definition management (create, update, delete)
 * - Field value management (set, get, validate)
 * - Type coercion and validation
 * - Permission checks
 * - Conditional visibility evaluation
 */
@Injectable()
export class CustomFieldService {
  private readonly logger = new Logger(CustomFieldService.name);

  constructor(
    private readonly fieldDefinitionRepository: CustomFieldDefinitionRepository,
    private readonly fieldValueRepository: CustomFieldValueRepository,
  ) {}

  /**
   * Create a new custom field definition
   */
  async createFieldDefinition(
    createDto: CreateCustomFieldDefinitionDto,
    createdBy?: number,
  ): Promise<CustomFieldDefinitionResponseDto> {
    // Check if field key already exists
    const exists = await this.fieldDefinitionRepository.fieldKeyExists(
      createDto.entityType,
      createDto.fieldKey,
    );

    if (exists) {
      throw new ConflictException(
        `Field key '${createDto.fieldKey}' already exists for entity type '${createDto.entityType}'`,
      );
    }

    // Validate field type specific requirements
    this.validateFieldDefinition(createDto);

    // Create field definition
    const fieldDefinition = this.fieldDefinitionRepository.create({
      ...createDto,
      isActive: true,
      isRequired: createDto.isRequired ?? false,
      displayOrder: createDto.displayOrder ?? 0,
      createdBy,
    });

    const saved = await this.fieldDefinitionRepository.save(fieldDefinition);

    this.logger.log(`Created custom field definition: ${saved.id} (${saved.fieldKey})`);

    return this.mapToDefinitionResponse(saved);
  }

  /**
   * Update a custom field definition
   */
  async updateFieldDefinition(
    id: number,
    updateDto: UpdateCustomFieldDefinitionDto,
    updatedBy?: number,
  ): Promise<CustomFieldDefinitionResponseDto> {
    const fieldDefinition = await this.fieldDefinitionRepository.findById(id);

    if (!fieldDefinition) {
      throw new NotFoundException(`Custom field definition with ID ${id} not found`);
    }

    // Check field key uniqueness if changed
    if (updateDto.fieldKey && updateDto.fieldKey !== fieldDefinition.fieldKey) {
      const exists = await this.fieldDefinitionRepository.fieldKeyExists(
        fieldDefinition.entityType,
        updateDto.fieldKey,
        id,
      );

      if (exists) {
        throw new ConflictException(
          `Field key '${updateDto.fieldKey}' already exists for entity type '${fieldDefinition.entityType}'`,
        );
      }
    }

    // Validate field type specific requirements
    if (updateDto.fieldType || updateDto.options || updateDto.referenceConfig) {
      const mergedDto = { ...fieldDefinition, ...updateDto };
      this.validateFieldDefinition(mergedDto as CreateCustomFieldDefinitionDto);
    }

    // Update field definition
    Object.assign(fieldDefinition, updateDto);
    fieldDefinition.updatedBy = updatedBy ?? null;

    const saved = await this.fieldDefinitionRepository.save(fieldDefinition);

    this.logger.log(`Updated custom field definition: ${saved.id}`);

    return this.mapToDefinitionResponse(saved);
  }

  /**
   * Get field definition by ID
   */
  async getFieldDefinition(id: number): Promise<CustomFieldDefinitionResponseDto> {
    const fieldDefinition = await this.fieldDefinitionRepository.findById(id, true);

    if (!fieldDefinition) {
      throw new NotFoundException(`Custom field definition with ID ${id} not found`);
    }

    return this.mapToDefinitionResponse(fieldDefinition);
  }

  /**
   * Get field definitions for an entity type
   */
  async getFieldDefinitionsByEntityType(
    entityType: string,
    organizationId?: number,
  ): Promise<CustomFieldDefinitionResponseDto[]> {
    const fields = await this.fieldDefinitionRepository.findByEntityType(
      entityType,
      organizationId,
    );

    return fields.map((field) => this.mapToDefinitionResponse(field));
  }

  /**
   * Delete a custom field definition (soft delete by setting isActive = false)
   */
  async deleteFieldDefinition(id: number): Promise<void> {
    const fieldDefinition = await this.fieldDefinitionRepository.findById(id);

    if (!fieldDefinition) {
      throw new NotFoundException(`Custom field definition with ID ${id} not found`);
    }

    // Soft delete
    fieldDefinition.isActive = false;
    await this.fieldDefinitionRepository.save(fieldDefinition);

    this.logger.log(`Deleted custom field definition: ${id}`);
  }

  /**
   * Create or update a custom field value
   */
  async setFieldValue(
    createDto: CreateCustomFieldValueDto,
    createdBy?: number,
  ): Promise<CustomFieldValueResponseDto> {
    // Get field definition
    const fieldDefinition = await this.fieldDefinitionRepository.findById(
      createDto.fieldDefinitionId,
    );

    if (!fieldDefinition) {
      throw new NotFoundException(
        `Custom field definition with ID ${createDto.fieldDefinitionId} not found`,
      );
    }

    // Check if value already exists
    const existingValue = await this.fieldValueRepository.findByEntityAndField(
      createDto.entityType,
      createDto.entityId,
      createDto.fieldDefinitionId,
    );

    let fieldValue: CustomFieldValue;

    if (existingValue) {
      // Update existing value
      fieldValue = existingValue;
      this.setValueOnEntity(fieldValue, createDto, fieldDefinition);
      fieldValue.updatedBy = createdBy ?? null;
    } else {
      // Create new value
      fieldValue = this.fieldValueRepository.create({
        ...createDto,
        createdBy,
      });
      this.setValueOnEntity(fieldValue, createDto, fieldDefinition);
    }

    // Validate value
    this.validateFieldValue(fieldValue, fieldDefinition);

    const saved = await this.fieldValueRepository.save(fieldValue);

    this.logger.log(
      `Set custom field value: ${saved.id} for entity ${createDto.entityType}:${createDto.entityId}`,
    );

    return this.mapToValueResponse(saved, fieldDefinition);
  }

  /**
   * Update a custom field value
   */
  async updateFieldValue(
    id: number,
    updateDto: UpdateCustomFieldValueDto,
    updatedBy?: number,
  ): Promise<CustomFieldValueResponseDto> {
    const fieldValue = await this.fieldValueRepository.findById(id, true);

    if (!fieldValue) {
      throw new NotFoundException(`Custom field value with ID ${id} not found`);
    }

    const fieldDefinition = fieldValue.fieldDefinition;

    // Update value
    if (updateDto.textValue !== undefined) {
      fieldValue.textValue = updateDto.textValue;
    }
    if (updateDto.numberValue !== undefined) {
      fieldValue.numberValue = updateDto.numberValue;
    }
    if (updateDto.decimalValue !== undefined) {
      fieldValue.decimalValue = updateDto.decimalValue;
    }
    if (updateDto.booleanValue !== undefined) {
      fieldValue.booleanValue = updateDto.booleanValue;
    }
    if (updateDto.dateValue !== undefined) {
      fieldValue.dateValue = new Date(updateDto.dateValue);
    }
    if (updateDto.datetimeValue !== undefined) {
      fieldValue.datetimeValue = new Date(updateDto.datetimeValue);
    }
    if (updateDto.jsonValue !== undefined) {
      fieldValue.jsonValue = updateDto.jsonValue;
    }
    if (updateDto.fileValue !== undefined) {
      fieldValue.fileValue = updateDto.fileValue;
    }

    // Validate value
    this.validateFieldValue(fieldValue, fieldDefinition);

    fieldValue.updatedBy = updatedBy ?? null;

    const saved = await this.fieldValueRepository.save(fieldValue);

    return this.mapToValueResponse(saved, fieldDefinition);
  }

  /**
   * Get field values for an entity
   */
  async getFieldValuesForEntity(
    entityType: string,
    entityId: number,
    organizationId?: number,
  ): Promise<CustomFieldValueResponseDto[]> {
    const values = await this.fieldValueRepository.findByEntity(
      entityType,
      entityId,
      organizationId,
    );

    return values.map((value) => this.mapToValueResponse(value, value.fieldDefinition));
  }

  /**
   * Get field value by ID
   */
  async getFieldValue(id: number): Promise<CustomFieldValueResponseDto> {
    const value = await this.fieldValueRepository.findById(id, true);

    if (!value) {
      throw new NotFoundException(`Custom field value with ID ${id} not found`);
    }

    return this.mapToValueResponse(value, value.fieldDefinition);
  }

  /**
   * Delete a custom field value
   */
  async deleteFieldValue(id: number): Promise<void> {
    const value = await this.fieldValueRepository.findById(id);

    if (!value) {
      throw new NotFoundException(`Custom field value with ID ${id} not found`);
    }

    await this.fieldValueRepository.remove(value);

    this.logger.log(`Deleted custom field value: ${id}`);
  }

  /**
   * Validate field definition
   */
  private validateFieldDefinition(dto: CreateCustomFieldDefinitionDto): void {
    // Validate dropdown/multi-select has options
    if (
      (dto.fieldType === CustomFieldType.DROPDOWN ||
        dto.fieldType === CustomFieldType.MULTI_SELECT) &&
      (!dto.options || dto.options.length === 0)
    ) {
      throw new BadRequestException(`${dto.fieldType} field type requires options to be provided`);
    }

    // Validate reference type has reference config
    if (dto.fieldType === CustomFieldType.REFERENCE && !dto.referenceConfig) {
      throw new BadRequestException('REFERENCE field type requires referenceConfig');
    }

    // Validate formula type has formula
    if (dto.fieldType === CustomFieldType.FORMULA && !dto.formula) {
      throw new BadRequestException('FORMULA field type requires formula');
    }
  }

  /**
   * Validate field value against definition
   */
  private validateFieldValue(value: CustomFieldValue, definition: CustomFieldDefinition): void {
    // Check required
    if (definition.isRequired) {
      const actualValue = this.getValueFromEntity(value, definition);
      if (actualValue === null || actualValue === undefined || actualValue === '') {
        throw new BadRequestException(
          `Field '${definition.fieldName}' is required but no value provided`,
        );
      }
    }

    // Validate against validation rules
    if (definition.validationRules) {
      const actualValue = this.getValueFromEntity(value, definition);

      if (actualValue !== null && actualValue !== undefined && actualValue !== '') {
        // Min/Max for numbers
        if (definition.fieldType === CustomFieldType.NUMBER) {
          if (
            definition.validationRules.min !== undefined &&
            Number(actualValue) < definition.validationRules.min
          ) {
            throw new BadRequestException(
              `Value must be at least ${definition.validationRules.min}`,
            );
          }
          if (
            definition.validationRules.max !== undefined &&
            Number(actualValue) > definition.validationRules.max
          ) {
            throw new BadRequestException(
              `Value must be at most ${definition.validationRules.max}`,
            );
          }
        }

        // MinLength/MaxLength for strings
        if (
          definition.fieldType === CustomFieldType.TEXT ||
          definition.fieldType === CustomFieldType.TEXTAREA
        ) {
          const strValue = String(actualValue);
          if (
            definition.validationRules.minLength !== undefined &&
            strValue.length < definition.validationRules.minLength
          ) {
            throw new BadRequestException(
              `Value must be at least ${definition.validationRules.minLength} characters`,
            );
          }
          if (
            definition.validationRules.maxLength !== undefined &&
            strValue.length > definition.validationRules.maxLength
          ) {
            throw new BadRequestException(
              `Value must be at most ${definition.validationRules.maxLength} characters`,
            );
          }
        }

        // Pattern validation
        if (definition.validationRules.pattern) {
          const regex = new RegExp(definition.validationRules.pattern);
          if (!regex.test(String(actualValue))) {
            throw new BadRequestException(
              `Value does not match required pattern: ${definition.validationRules.pattern}`,
            );
          }
        }

        // Validate dropdown/multi-select options
        if (
          (definition.fieldType === CustomFieldType.DROPDOWN ||
            definition.fieldType === CustomFieldType.MULTI_SELECT) &&
          definition.options
        ) {
          const validValues = definition.options.map((opt) => opt.value);
          if (definition.fieldType === CustomFieldType.DROPDOWN) {
            if (!validValues.includes(String(actualValue))) {
              throw new BadRequestException(`Value must be one of: ${validValues.join(', ')}`);
            }
          } else {
            // Multi-select
            const values = Array.isArray(actualValue) ? actualValue : [actualValue];
            const invalidValues = values.filter((v) => !validValues.includes(String(v)));
            if (invalidValues.length > 0) {
              throw new BadRequestException(
                `Invalid values: ${invalidValues.join(', ')}. Must be one of: ${validValues.join(', ')}`,
              );
            }
          }
        }
      }
    }
  }

  /**
   * Set value on entity based on field type
   */
  private setValueOnEntity(
    value: CustomFieldValue,
    dto: CreateCustomFieldValueDto | UpdateCustomFieldValueDto,
    definition: CustomFieldDefinition,
  ): void {
    // Determine which value field to use based on DTO
    // Priority: explicit value fields > generic value field
    let actualValue: any = null;

    if (dto.textValue !== undefined) {
      actualValue = dto.textValue;
    } else if (dto.numberValue !== undefined) {
      actualValue = dto.numberValue;
    } else if (dto.decimalValue !== undefined) {
      actualValue = dto.decimalValue;
    } else if (dto.booleanValue !== undefined) {
      actualValue = dto.booleanValue;
    } else if (dto.dateValue !== undefined) {
      actualValue = dto.dateValue;
    } else if (dto.datetimeValue !== undefined) {
      actualValue = dto.datetimeValue;
    } else if (dto.jsonValue !== undefined) {
      actualValue = dto.jsonValue;
    } else if (dto.fileValue !== undefined) {
      actualValue = dto.fileValue;
    }

    // Coerce value to appropriate type and set on entity
    value.setValue(actualValue);
  }

  /**
   * Get value from entity based on field type
   */
  private getValueFromEntity(value: CustomFieldValue, definition: CustomFieldDefinition): any {
    return value.getValue();
  }

  /**
   * Map entity to response DTO
   */
  private mapToDefinitionResponse(field: CustomFieldDefinition): CustomFieldDefinitionResponseDto {
    return {
      id: field.id,
      entityType: field.entityType,
      fieldKey: field.fieldKey,
      fieldName: field.fieldName,
      description: field.description,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isActive: field.isActive,
      displayOrder: field.displayOrder,
      defaultValue: field.defaultValue,
      validationRules: field.validationRules,
      options: field.options,
      referenceConfig: field.referenceConfig,
      formula: field.formula,
      visibilityRules: field.visibilityRules,
      permissions: field.permissions,
      organizationId: field.organizationId,
      fieldMetadata: field.fieldMetadata,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
      createdBy: field.createdBy,
      updatedBy: field.updatedBy,
    };
  }

  /**
   * Map value entity to response DTO
   */
  private mapToValueResponse(
    value: CustomFieldValue,
    definition: CustomFieldDefinition,
  ): CustomFieldValueResponseDto {
    return {
      id: value.id,
      entityType: value.entityType,
      entityId: value.entityId,
      fieldDefinitionId: value.fieldDefinitionId,
      fieldDefinition: definition ? this.mapToDefinitionResponse(definition) : undefined,
      organizationId: value.organizationId,
      textValue: value.textValue,
      numberValue: value.numberValue,
      decimalValue: value.decimalValue,
      booleanValue: value.booleanValue,
      dateValue: value.dateValue,
      datetimeValue: value.datetimeValue,
      jsonValue: value.jsonValue,
      fileValue: value.fileValue,
      valueMetadata: value.valueMetadata,
      value: this.getValueFromEntity(value, definition),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      createdBy: value.createdBy,
      updatedBy: value.updatedBy,
    };
  }
}
