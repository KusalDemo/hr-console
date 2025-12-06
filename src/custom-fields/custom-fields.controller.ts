import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomFieldService } from './services/custom-field.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  CreateCustomFieldValueDto,
  UpdateCustomFieldValueDto,
  CustomFieldDefinitionResponseDto,
  CustomFieldValueResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Custom Fields Controller
 * 
 * REST API endpoints for custom field management:
 * - Field definitions (CRUD)
 * - Field values (CRUD)
 * - Entity-specific field queries
 */
@Controller('custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldService: CustomFieldService) {}

  /**
   * Create a new custom field definition
   * POST /custom-fields/definitions
   */
  @Post('definitions')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createFieldDefinition(
    @Body() createDto: CreateCustomFieldDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CustomFieldDefinitionResponseDto> {
    return this.customFieldService.createFieldDefinition(createDto, user.userId);
  }

  /**
   * Get all field definitions (with pagination and filters)
   * GET /custom-fields/definitions
   */
  @Get('definitions')
  async getFieldDefinitions(
    @Query('entityType') entityType?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ fields: CustomFieldDefinitionResponseDto[]; total: number }> {
    // If entityType is provided, use the entity-specific endpoint
    if (entityType) {
      const fields = await this.customFieldService.getFieldDefinitionsByEntityType(
        entityType,
        organizationId,
      );
      return { fields, total: fields.length };
    }

    // For pagination, we'd need to expose repository method or add service method
    // For now, return empty if no entityType (should use entity-specific endpoint)
    return { fields: [], total: 0 };
  }

  /**
   * Get field definitions for a specific entity type
   * GET /custom-fields/definitions/entity/:entityType
   */
  @Get('definitions/entity/:entityType')
  async getFieldDefinitionsByEntityType(
    @Param('entityType') entityType: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<CustomFieldDefinitionResponseDto[]> {
    return this.customFieldService.getFieldDefinitionsByEntityType(entityType, organizationId);
  }

  /**
   * Get a field definition by ID
   * GET /custom-fields/definitions/:id
   */
  @Get('definitions/:id')
  async getFieldDefinition(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomFieldDefinitionResponseDto> {
    return this.customFieldService.getFieldDefinition(id);
  }

  /**
   * Update a field definition
   * PUT /custom-fields/definitions/:id
   */
  @Put('definitions/:id')
  @Roles('ADMIN', 'HR')
  async updateFieldDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCustomFieldDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CustomFieldDefinitionResponseDto> {
    return this.customFieldService.updateFieldDefinition(id, updateDto, user.userId);
  }

  /**
   * Delete a field definition (soft delete)
   * DELETE /custom-fields/definitions/:id
   */
  @Delete('definitions/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFieldDefinition(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.customFieldService.deleteFieldDefinition(id);
  }

  /**
   * Create or update a field value
   * POST /custom-fields/values
   */
  @Post('values')
  @HttpCode(HttpStatus.CREATED)
  async setFieldValue(
    @Body() createDto: CreateCustomFieldValueDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CustomFieldValueResponseDto> {
    return this.customFieldService.setFieldValue(createDto, user.userId);
  }

  /**
   * Get field values for an entity
   * GET /custom-fields/values/entity/:entityType/:entityId
   */
  @Get('values/entity/:entityType/:entityId')
  async getFieldValuesForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<CustomFieldValueResponseDto[]> {
    return this.customFieldService.getFieldValuesForEntity(entityType, entityId, organizationId);
  }

  /**
   * Get a field value by ID
   * GET /custom-fields/values/:id
   */
  @Get('values/:id')
  async getFieldValue(@Param('id', ParseIntPipe) id: number): Promise<CustomFieldValueResponseDto> {
    return this.customFieldService.getFieldValue(id);
  }

  /**
   * Update a field value
   * PUT /custom-fields/values/:id
   */
  @Put('values/:id')
  async updateFieldValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCustomFieldValueDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CustomFieldValueResponseDto> {
    return this.customFieldService.updateFieldValue(id, updateDto, user.userId);
  }

  /**
   * Delete a field value
   * DELETE /custom-fields/values/:id
   */
  @Delete('values/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFieldValue(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.customFieldService.deleteFieldValue(id);
  }
}

