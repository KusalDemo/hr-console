import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { InputType, Field, Int } from '@nestjs/graphql';
import { EmployeeType, EmploymentStatus } from '../entities/employee.entity';
import { JSONScalar } from '../../graphql/scalars/json.scalar';

/**
 * Create Employee DTO
 * Data transfer object for creating a new employee
 */
@InputType()
export class CreateEmployeeDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  externalId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @Field(() => String)
  @IsString()
  firstName: string;

  @Field(() => String)
  @IsString()
  lastName: string;

  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(EmployeeType)
  employeeType?: EmployeeType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  costCenterId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  managerId?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  mobile?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  gender?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  // Note: profileMetadata uses JSON scalar type
  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  @IsObject()
  profileMetadata?: Record<string, any>;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => Int)
  @IsNumber()
  organizationId: number;
}
