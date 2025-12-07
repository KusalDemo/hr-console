import { IsString } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

/**
 * Reject Timesheet DTO
 */
@InputType()
export class RejectTimesheetDto {
  @Field(() => String)
  @IsString()
  reason: string;
}

