import { IsDateString, IsNumber, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { JSONScalar } from '../../graphql/scalars/json.scalar';

/**
 * Create Timesheet Entry DTO
 */
@InputType()
export class CreateTimesheetEntryDto {
  @Field(() => Int)
  @IsNumber()
  @Type(() => Number)
  timesheetId: number;

  @Field(() => String)
  @IsDateString()
  entryDate: string;

  @Field(() => Float)
  @IsNumber()
  @Type(() => Number)
  hours: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  billable?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taskId?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  billingRate?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costRate?: number;

  // Note: entryMetadata uses JSON scalar type
  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  entryMetadata?: Record<string, any>;
}
