import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeArticleDto } from './create-knowledge-article.dto';

/**
 * Update Knowledge Article DTO
 */
export class UpdateKnowledgeArticleDto extends PartialType(CreateKnowledgeArticleDto) {}
