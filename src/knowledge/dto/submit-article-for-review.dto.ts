import { IsOptional, IsString } from 'class-validator';

/**
 * Submit Article for Review DTO
 */
export class SubmitArticleForReviewDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
