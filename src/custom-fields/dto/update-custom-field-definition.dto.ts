import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomFieldDefinitionDto } from './create-custom-field-definition.dto';

/**
 * Update Custom Field Definition DTO
 * All fields are optional
 */
export class UpdateCustomFieldDefinitionDto extends PartialType(CreateCustomFieldDefinitionDto) {}

