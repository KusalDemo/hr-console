import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InputType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';
import { JSONScalar } from '../../graphql/scalars/json.scalar';
import { PhaseStatus } from '../entities/project-phase.entity';

registerEnumType(PhaseStatus, { name: 'PhaseStatus' });

/**
 * Create Project Phase DTO
 */
@InputType()
export class CreateProjectPhaseDto {
  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sequence?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(PhaseStatus)
  status?: PhaseStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedHours?: number;

  // Note: phaseMetadata uses JSON scalar type
  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  @IsObject()
  phaseMetadata?: Record<string, any>;
}

