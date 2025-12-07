import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Clone Dashboard DTO
 */
export class CloneDashboardDto {
  @IsString()
  newDashboardName: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;
}
