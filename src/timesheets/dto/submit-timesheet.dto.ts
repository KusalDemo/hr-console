import { IsOptional, IsString } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

/**
 * Submit Timesheet DTO
 */
@InputType()
export class SubmitTimesheetDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  workflowKey?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

