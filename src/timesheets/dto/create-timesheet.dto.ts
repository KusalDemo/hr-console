import { IsNumber, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { InputType, Field, Int } from '@nestjs/graphql';

/**
 * Create Timesheet DTO
 */
@InputType()
export class CreateTimesheetDto {
  @Field(() => Int)
  @IsNumber()
  @Type(() => Number)
  employeeId: number;

  @Field(() => Int)
  @IsNumber()
  @Type(() => Number)
  periodId: number;

  @Field(() => String)
  @IsDateString()
  date: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;
}

