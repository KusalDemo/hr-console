import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

/**
 * DTO for sending a generic email
 */
export class SendEmailDto {
  @IsNotEmpty({ message: 'Recipient email is required' })
  @IsEmail({}, { message: 'Recipient email must be a valid email address' })
  to: string;

  @IsNotEmpty({ message: 'Email subject is required' })
  @IsString({ message: 'Email subject must be a string' })
  subject: string;

  @IsOptional()
  @IsString({ message: 'Email text content must be a string' })
  text?: string;

  @IsOptional()
  @IsString({ message: 'Email HTML content must be a string' })
  html?: string;

  @IsOptional()
  @IsEmail({}, { message: 'CC email must be a valid email address' })
  cc?: string;

  @IsOptional()
  @IsEmail({}, { message: 'BCC email must be a valid email address' })
  bcc?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Reply-to email must be a valid email address' })
  replyTo?: string;
}


