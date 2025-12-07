import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KeyResultType, KeyResultStatus } from '../entities/key-result.entity';

/**
 * Create Key Result DTO
 */
export class CreateKeyResultDto {
  @IsNumber()
  @Type(() => Number)
  goalId: number;

  @IsString()
  keyResultTitle: string;

  @IsOptional()
  @IsString()
  keyResultDescription?: string;

  @IsEnum(KeyResultType)
  keyResultType: KeyResultType;

  @IsOptional()
  @IsEnum(KeyResultStatus)
  status?: KeyResultStatus;

  @IsNumber()
  @Type(() => Number)
  ownerId: number;

  @IsNumber()
  @Type(() => Number)
  targetValue: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startingValue?: number;

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
