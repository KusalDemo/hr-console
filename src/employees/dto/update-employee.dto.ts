import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsDateString, IsString } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

/**
 * Update Employee DTO
 * Data transfer object for updating an employee
 * All fields are optional
 */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @IsString()
  terminationReason?: string;
}

