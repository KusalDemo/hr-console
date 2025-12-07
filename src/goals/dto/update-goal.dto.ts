import { PartialType } from '@nestjs/mapped-types';
import { CreateGoalDto } from './create-goal.dto';

/**
 * Update Goal DTO
 */
export class UpdateGoalDto extends PartialType(CreateGoalDto) {}
