import { PartialType } from '@nestjs/mapped-types';
import { CreateTeamDto } from './create-team.dto';

/**
 * Update Team DTO
 * Data transfer object for updating a team
 * All fields are optional
 */
export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

