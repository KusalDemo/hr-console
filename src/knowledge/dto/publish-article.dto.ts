import { IsOptional, IsDateString } from 'class-validator';

/**
 * Publish Article DTO
 */
export class PublishArticleDto {
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
