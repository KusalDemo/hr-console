import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormType, FormStatus } from '../entities/performance-review-form.entity';

/**
 * Create Review Form DTO
 */
export class CreateReviewFormDto {
  @IsNumber()
  @Type(() => Number)
  performanceReviewId: number;

  @IsEnum(FormType)
  formType: FormType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reviewerId?: number;

  @IsString()
  formTitle: string;

  @IsArray()
  @IsObject({ each: true })
  formData: Array<{
    id: string;
    question: string;
    questionType: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
    response?: any;
    rating?: number;
    comments?: string;
  }>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  formRating?: number;

  @IsOptional()
  @IsString()
  overallFeedback?: string;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  areasForImprovement?: string;

  @IsOptional()
  @IsEnum(FormStatus)
  formStatus?: FormStatus;

  @IsOptional()
  @IsObject()
  formMetadata?: Record<string, any>;
}
