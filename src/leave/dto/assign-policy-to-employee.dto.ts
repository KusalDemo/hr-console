import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Assign Policy to Employee DTO
 */
export class AssignPolicyToEmployeeDto {
  @IsNumber()
  @Type(() => Number)
  policyId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  priority?: number;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsString()
  assignmentNotes?: string;
}
