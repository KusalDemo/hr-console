import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeCategoryDto } from './create-knowledge-category.dto';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Update Knowledge Category DTO
 */
export class UpdateKnowledgeCategoryDto extends PartialType(CreateKnowledgeCategoryDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
