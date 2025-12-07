import { PartialType } from '@nestjs/mapped-types';
import { CreateImportTemplateDto } from './create-import-template.dto';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Update Import Template DTO
 */
export class UpdateImportTemplateDto extends PartialType(CreateImportTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
