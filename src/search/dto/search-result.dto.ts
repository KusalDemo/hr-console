export class SearchResultDto {
  id: number;
  entityType: string;
  title: string;
  description: string;
  url: string;
  relevance?: number;
  metadata?: Record<string, any>;
}
