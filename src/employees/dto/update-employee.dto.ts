import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsDateString, IsString } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';
import { CreateEmployeeDto } from './create-employee.dto';

/**
 * Update Employee DTO
 * Data transfer object for updating an employee
 * All fields are optional
 */
@InputType()
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  terminationReason?: string;
}
