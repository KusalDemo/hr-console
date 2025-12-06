import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessRuleDto } from './create-business-rule.dto';

/**
 * Update Business Rule DTO
 */
export class UpdateBusinessRuleDto extends PartialType(CreateBusinessRuleDto) {}

