import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceDto } from './create-resource.dto';

/**
 * Update Resource DTO
 */
export class UpdateResourceDto extends PartialType(CreateResourceDto) {}
