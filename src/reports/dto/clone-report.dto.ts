import { IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Clone Report DTO
 */
export class CloneReportDto {
  @IsString()
  newReportName: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;
}
