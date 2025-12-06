import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { TeamStatus } from '../entities/team.entity';

/**
 * Create Team DTO
 * Data transfer object for creating a new team
 */
export class CreateTeamDto {
  @IsString()
  teamKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsNumber()
  teamLeadId?: number;

  @IsOptional()
  @IsNumber()
  sizeLimit?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNumber()
  organizationId: number;
}

