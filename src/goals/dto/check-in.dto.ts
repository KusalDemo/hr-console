import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Goal Check-In DTO
 */
export class GoalCheckInDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  progressUpdate?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  milestonesCompleted?: string[];
}

/**
 * Key Result Check-In DTO
 */
export class KeyResultCheckInDto {
  @IsNumber()
  @Type(() => Number)
  value: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
