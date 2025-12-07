import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KeyResultStatus } from '../entities/key-result.entity';

/**
 * Update Key Result DTO
 */
export class UpdateKeyResultDto {
  @IsOptional()
  @IsString()
  keyResultTitle?: string;

  @IsOptional()
  @IsString()
  keyResultDescription?: string;

  @IsOptional()
  @IsEnum(KeyResultStatus)
  status?: KeyResultStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  targetValue?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentValue?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  targetCompletionDate?: string;
}
