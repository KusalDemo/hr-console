import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Equipment Assignment DTO
 */
export class CreateEquipmentAssignmentDto {
  @IsNumber()
  @Type(() => Number)
  equipmentId: number;

  @IsNumber()
  @Type(() => Number)
  employeeId: number;

  @IsOptional()
  @IsDateString()
  expectedReturnDate?: string;

  @IsOptional()
  @IsString()
  assignmentNotes?: string;

  @IsOptional()
  @IsString()
  conditionAtAssignment?: string;
}
