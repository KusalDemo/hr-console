import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartmentDto } from './create-department.dto';

/**
 * Update Department DTO
 * Data transfer object for updating a department
 * All fields are optional
 */
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

