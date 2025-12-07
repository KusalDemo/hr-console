import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { CommentType } from '../entities/ticket-comment.entity';

/**
 * Add Ticket Comment DTO
 */
export class AddTicketCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(CommentType)
  commentType?: CommentType;
}
