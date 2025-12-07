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
  ParseBoolPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FormService } from './services/form.service';
import {
  CreateFormDefinitionDto,
  UpdateFormDefinitionDto,
  SubmitFormResponseDto,
  UpdateFormResponseStatusDto,
  CloneFormDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FormStatus, FormAccessType } from './entities/form-definition.entity';
import { FormResponseStatus } from './entities/form-response.entity';
import { Request } from 'express';

/**
 * Forms Controller
 * 
 * REST API endpoints for form management:
 * - Form definition CRUD operations
 * - Form templates and cloning
 * - Form versioning
 * - Form publishing
 * - Form response submission
 * - Response management
 * - Form analytics
 */
@Controller('forms')
export class FormsController {
  constructor(private readonly formService: FormService) {}

  // ========== Form Definition Endpoints ==========

  /**
   * Create a new form definition
   * POST /forms
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async createFormDefinition(
    @Body() createDto: CreateFormDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.formService.createFormDefinition(createDto, user.userId);
  }

  /**
   * Get form definition by ID
   * GET /forms/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getFormDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeResponses', new ParseBoolPipe({ optional: true })) includeResponses = false,
  ) {
    return this.formService.getFormDefinitionById(id, includeResponses);
  }

  /**
   * Get published form (public endpoint, no auth required)
   * GET /forms/:id/public
   */
  @Get(':id/public')
  async getPublishedForm(@Param('id', ParseIntPipe) id: number) {
    const form = await this.formService.getFormDefinitionById(id);
    
    if (form.status !== FormStatus.PUBLISHED) {
      throw new ForbiddenException('Form is not published');
    }

    if (!form.isActive) {
      throw new ForbiddenException('Form is not active');
    }

    return form;
  }

  /**
   * Update form definition
   * PUT /forms/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateFormDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFormDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.formService.updateFormDefinition(id, updateDto, user.userId);
  }

  /**
   * Delete form definition
   * DELETE /forms/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async deleteFormDefinition(@Param('id', ParseIntPipe) id: number) {
    await this.formService.deleteFormDefinition(id);
  }

  /**
   * Publish form
   * POST /forms/:id/publish
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async publishForm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.formService.publishForm(id, user.userId);
  }

  /**
   * Archive form
   * POST /forms/:id/archive
   */
  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async archiveForm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.formService.archiveForm(id, user.userId);
  }

  /**
   * Clone form
   * POST /forms/:id/clone
   */
  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async cloneForm(
    @Param('id', ParseIntPipe) sourceFormId: number,
    @Body() cloneDto: CloneFormDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.formService.cloneForm(
      sourceFormId,
      cloneDto.newFormName,
      cloneDto.organizationId,
      user.userId,
    );
  }

  /**
   * Get forms by organization
   * GET /forms/organization/:organizationId
   */
  @Get('organization/:organizationId')
  @UseGuards(JwtAuthGuard)
  async getFormsByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.formService.getFormsByOrganization(organizationId, includeInactive);
  }

  /**
   * Get published forms
   * GET /forms/published
   */
  @Get('published')
  async getPublishedForms(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.formService.getPublishedForms(organizationId);
  }

  /**
   * Get form templates
   * GET /forms/templates
   */
  @Get('templates')
  @UseGuards(JwtAuthGuard)
  async getTemplates(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.formService.getTemplates(organizationId);
  }

  /**
   * Search forms
   * GET /forms/search
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchForms(
    @Query('searchTerm') searchTerm?: string,
    @Query('status') status?: FormStatus,
    @Query('category') category?: string,
    @Query('accessType') accessType?: FormAccessType,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.formService.searchForms(
      searchTerm,
      status,
      category,
      accessType,
      organizationId,
      includeInactive,
    );
  }

  // ========== Form Response Endpoints ==========

  /**
   * Submit form response
   * POST /forms/:formId/responses
   */
  @Post(':formId/responses')
  @HttpCode(HttpStatus.CREATED)
  async submitFormResponse(
    @Param('formId', ParseIntPipe) formId: number,
    @Body() submitDto: SubmitFormResponseDto,
    @CurrentUser() user?: JwtPayload,
    @Req() request?: Request,
  ) {
    const ipAddress = request?.ip || request?.socket?.remoteAddress || undefined;
    const userAgent = request?.headers['user-agent'] || undefined;

    return this.formService.submitFormResponse(
      formId,
      submitDto.responseData,
      user?.userId,
      submitDto.isAnonymous || false,
      submitDto.anonymousIdentifier,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Get form responses
   * GET /forms/:formId/responses
   */
  @Get(':formId/responses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async getFormResponses(
    @Param('formId', ParseIntPipe) formId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.formService.getFormResponses(formId, includeInactive);
  }

  /**
   * Get form response by ID
   * GET /forms/responses/:id
   */
  @Get('responses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async getFormResponse(@Param('id', ParseIntPipe) id: number) {
    return this.formService.getFormResponseById(id);
  }

  /**
   * Update form response status
   * PUT /forms/responses/:id/status
   */
  @Put('responses/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateFormResponseStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFormResponseStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.formService.updateFormResponseStatus(
      id,
      updateDto.status,
      updateDto.notes,
      user.userId,
    );
  }

  /**
   * Get form statistics
   * GET /forms/:id/statistics
   */
  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async getFormStatistics(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.formService.getFormStatistics(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
