import { IsOptional, IsString } from 'class-validator';

/**
 * Approve Article DTO
 */
export class ApproveArticleDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
