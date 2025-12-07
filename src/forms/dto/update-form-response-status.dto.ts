import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FormResponseStatus } from '../entities/form-response.entity';

/**
 * Update Form Response Status DTO
 */
export class UpdateFormResponseStatusDto {
  @IsEnum(FormResponseStatus)
  status: FormResponseStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
