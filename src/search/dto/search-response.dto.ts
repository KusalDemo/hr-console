import { SearchResultDto } from './search-result.dto';
import { FacetDto } from './facet.dto';

export class SearchResponseDto {
  results: SearchResultDto[];
  total: number;
  facets: Record<string, FacetDto[]>;
  query: string;
  entityTypes: string[];
}
