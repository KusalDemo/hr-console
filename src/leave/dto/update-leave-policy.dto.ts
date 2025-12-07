import { PartialType } from '@nestjs/mapped-types';
import { CreateLeavePolicyDto } from './create-leave-policy.dto';

/**
 * Update Leave Policy DTO
 */
export class UpdateLeavePolicyDto extends PartialType(CreateLeavePolicyDto) {}
