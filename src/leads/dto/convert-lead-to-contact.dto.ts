import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ContactType, ContactCategory } from '../../contacts/entities/contact.entity';

/**
 * Convert Lead to Contact DTO
 */
export class ConvertLeadToContactDto {
  @IsOptional()
  @IsEnum(ContactType)
  contactType?: ContactType;

  @IsOptional()
  @IsEnum(ContactCategory)
  contactCategory?: ContactCategory;

  @IsOptional()
  @IsString()
  conversionReason?: string;
}


