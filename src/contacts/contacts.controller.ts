import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { ContactService } from './services/contact.service';
import {
  CreateContactDto,
  UpdateContactDto,
  CreateContactRelationshipDto,
  CreateContactInteractionDto,
  ContactResponseDto,
  ContactRelationshipResponseDto,
  ContactInteractionResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ContactCategory, ContactStatus } from './entities/contact.entity';

/**
 * Contacts Controller
 * 
 * REST API endpoints for contact management:
 * - Contacts (CRUD, search, segmentation)
 * - Contact relationships
 * - Contact interactions
 * - Duplicate detection and merge
 */
@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * Create a new contact
   * POST /contacts
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'SALES', 'EMPLOYEE')
  async createContact(
    @Body() createDto: CreateContactDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContactResponseDto> {
    return this.contactService.createContact(createDto, user.userId);
  }

  /**
   * Get contact by ID
   * GET /contacts/:id
   */
  @Get(':id')
  async getContact(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<ContactResponseDto> {
    return this.contactService.getContactById(id, includeRelations);
  }

  /**
   * Get contact by key
   * GET /contacts/key/:key
   */
  @Get('key/:key')
  async getContactByKey(
    @Param('key') key: string,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<ContactResponseDto> {
    return this.contactService.getContactByKey(key, includeRelations);
  }

  /**
   * Update contact
   * PUT /contacts/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'SALES', 'EMPLOYEE')
  async updateContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateContactDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContactResponseDto> {
    return this.contactService.updateContact(id, updateDto, user.userId);
  }

  /**
   * Search contacts
   * GET /contacts/search
   */
  @Get('search')
  async searchContacts(
    @Query('q') searchTerm: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    return this.contactService.searchContacts(searchTerm, organizationId, includeArchived);
  }

  /**
   * Get contacts by category
   * GET /contacts/category/:category
   */
  @Get('category/:category')
  async getContactsByCategory(
    @Param('category') category: ContactCategory,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    return this.contactService.getContactsByCategory(category, organizationId, includeArchived);
  }

  /**
   * Get contacts by status
   * GET /contacts/status/:status
   */
  @Get('status/:status')
  async getContactsByStatus(
    @Param('status') status: ContactStatus,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    return this.contactService.getContactsByStatus(status, organizationId, includeArchived);
  }

  /**
   * Get contacts by tags
   * GET /contacts/tags
   */
  @Get('tags')
  async getContactsByTags(
    @Query('tags') tags: string, // Comma-separated tags
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    const tagArray = tags ? tags.split(',').map((t) => t.trim()) : [];
    return this.contactService.getContactsByTags(tagArray, organizationId, includeArchived);
  }

  /**
   * Get contacts needing follow-up
   * GET /contacts/follow-up
   */
  @Get('follow-up')
  @Roles('ADMIN', 'HR', 'SALES')
  async getContactsNeedingFollowUp(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('daysAhead', new ParseIntPipe({ optional: true })) daysAhead = 7,
  ): Promise<ContactResponseDto[]> {
    return this.contactService.getContactsNeedingFollowUp(organizationId, daysAhead);
  }

  /**
   * Find potential duplicates
   * GET /contacts/:id/duplicates
   */
  @Get(':id/duplicates')
  @Roles('ADMIN', 'HR', 'SALES')
  async findPotentialDuplicates(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ContactResponseDto[]> {
    return this.contactService.findPotentialDuplicates(id);
  }

  /**
   * Merge contacts
   * POST /contacts/:primaryId/merge/:duplicateId
   */
  @Post(':primaryId/merge/:duplicateId')
  @Roles('ADMIN', 'HR', 'SALES')
  async mergeContacts(
    @Param('primaryId', ParseIntPipe) primaryId: number,
    @Param('duplicateId', ParseIntPipe) duplicateId: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContactResponseDto> {
    return this.contactService.mergeContacts(primaryId, duplicateId, user.userId);
  }

  /**
   * Archive contact
   * POST /contacts/:id/archive
   */
  @Post(':id/archive')
  @Roles('ADMIN', 'HR', 'SALES')
  async archiveContact(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContactResponseDto> {
    return this.contactService.archiveContact(id, user.userId);
  }

  // ========== Relationship Endpoints ==========

  /**
   * Add relationship to contact
   * POST /contacts/:contactId/relationships
   */
  @Post(':contactId/relationships')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'SALES')
  async addRelationship(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() createDto: CreateContactRelationshipDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContactRelationshipResponseDto> {
    return this.contactService.addRelationship(contactId, createDto, user.userId);
  }

  // ========== Interaction Endpoints ==========

  /**
   * Add interaction to contact
   * POST /contacts/:contactId/interactions
   */
  @Post(':contactId/interactions')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'SALES', 'EMPLOYEE')
  async addInteraction(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() createDto: CreateContactInteractionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContactInteractionResponseDto> {
    return this.contactService.addInteraction(contactId, createDto, user.userId);
  }

  /**
   * Get contact interactions
   * GET /contacts/:contactId/interactions
   */
  @Get(':contactId/interactions')
  async getContactInteractions(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<ContactInteractionResponseDto[]> {
    return this.contactService.getContactInteractions(contactId, limit);
  }
}


