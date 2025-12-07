import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomFieldValueDto } from './create-custom-field-value.dto';

/**
 * Update Custom Field Value DTO
 * All fields are optional
 */
export class UpdateCustomFieldValueDto extends PartialType(CreateCustomFieldValueDto) {}

