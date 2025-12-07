import { PartialType } from '@nestjs/mapped-types';
import { CreateExportTemplateDto } from './create-export-template.dto';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Update Export Template DTO
 */
export class UpdateExportTemplateDto extends PartialType(CreateExportTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
