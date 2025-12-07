import { IsOptional, IsString } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

/**
 * Approve Timesheet DTO
 */
@InputType()
export class ApproveTimesheetDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

