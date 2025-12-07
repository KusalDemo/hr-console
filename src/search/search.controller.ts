import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SearchService, SearchIndexService } from './services';
import { SearchRequestDto, SearchResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Search Controller
 *
 * REST API endpoints for advanced search:
 * - Full-text search across entities
 * - Faceted search
 * - Search suggestions
 * - Index management
 */
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly indexService: SearchIndexService,
  ) {}

  /**
   * Search across entities
   * POST /search
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async search(@Body() searchDto: SearchRequestDto): Promise<SearchResponseDto> {
    return this.searchService.search(searchDto);
  }

  /**
   * Search (GET endpoint for convenience)
   * GET /search?q=query&entityTypes=employees,projects
   */
  @Get()
  async searchGet(
    @Query('q') query: string,
    @Query('entityTypes') entityTypes?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<SearchResponseDto> {
    const searchDto: SearchRequestDto = {
      query,
      entityTypes: entityTypes ? entityTypes.split(',') : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
    return this.searchService.search(searchDto);
  }

  /**
   * Get search suggestions
   * GET /search/suggestions?q=query
   */
  @Get('suggestions')
  async getSuggestions(@Query('q') query: string): Promise<{ suggestions: string[] }> {
    const suggestions = await this.searchService.getSuggestions(query);
    return { suggestions };
  }

  /**
   * Update search indexes
   * POST /search/indexes/update
   */
  @Post('indexes/update')
  @Roles('ADMIN')
  async updateIndexes(): Promise<{ updated: number }> {
    return this.indexService.updateAllIndexes();
  }

  /**
   * Rebuild search indexes
   * POST /search/indexes/rebuild
   */
  @Post('indexes/rebuild')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async rebuildIndexes(): Promise<void> {
    return this.indexService.rebuildAllIndexes();
  }
}
