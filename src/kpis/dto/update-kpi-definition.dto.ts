import { PartialType } from '@nestjs/mapped-types';
import { CreateKPIDefinitionDto } from './create-kpi-definition.dto';

/**
 * Update KPI Definition DTO
 */
export class UpdateKPIDefinitionDto extends PartialType(CreateKPIDefinitionDto) {}
