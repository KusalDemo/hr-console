import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDecimal,
} from 'class-validator';
import { DepartmentType, DepartmentStatus } from '../entities/department.entity';

/**
 * Create Department DTO
 * Data transfer object for creating a new department
 */
export class CreateDepartmentDto {
  @IsString()
  departmentKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  parentDepartmentId?: number;

  @IsOptional()
  @IsEnum(DepartmentType)
  departmentType?: DepartmentType;

  @IsOptional()
  @IsString()
  costCenterCode?: string;

  @IsOptional()
  @IsEnum(DepartmentStatus)
  status?: DepartmentStatus;

  @IsOptional()
  @IsNumber()
  managerId?: number;

  @IsOptional()
  @IsNumber()
  headcountLimit?: number;

  @IsOptional()
  @IsDecimal()
  budgetAllocated?: number;

  @IsOptional()
  @IsString()
  budgetPeriod?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNumber()
  organizationId: number;
}

