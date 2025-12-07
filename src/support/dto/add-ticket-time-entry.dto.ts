import { IsNumber, IsOptional, IsBoolean, IsString, IsDateString, Min } from 'class-validator';

/**
 * Add Ticket Time Entry DTO
 */
export class AddTicketTimeEntryDto {
  @IsNumber()
  @Min(1)
  timeMinutes: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}
