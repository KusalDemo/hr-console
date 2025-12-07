import { IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Clone Form DTO
 */
export class CloneFormDto {
  @IsString()
  newFormName: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;
}
