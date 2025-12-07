import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewType, ReviewStatus } from '../entities/performance-review.entity';

/**
 * Create Performance Review DTO
 */
export class CreatePerformanceReviewDto {
  @IsNumber()
  @Type(() => Number)
  reviewCycleId: number;

  @IsNumber()
  @Type(() => Number)
  employeeId: number;

  @IsNumber()
  @Type(() => Number)
  reviewerId: number;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsEnum(ReviewType)
  reviewType: ReviewType;

  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}
