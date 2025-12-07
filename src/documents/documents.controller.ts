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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentService } from './services';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  ShareDocumentDto,
  DocumentResponseDto,
  DocumentVersionResponseDto,
  DocumentShareResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DocumentType } from './entities';

/**
 * Documents Controller
 *
 * REST API endpoints for document management:
 * - Document CRUD operations
 * - File upload/download
 * - Version management
 * - Sharing and permissions
 * - Document lifecycle
 */
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentService: DocumentService) {}

  // ========== Document CRUD ==========

  /**
   * Create document
   * POST /documents
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async createDocument(
    @Body() createDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File | null,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentResponseDto> {
    return this.documentService.createDocument(createDto, file, user.userId);
  }

  /**
   * Get document by ID
   * GET /documents/:id
   */
  @Get(':id')
  async getDocument(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentResponseDto> {
    return this.documentService.getDocumentById(id, user.userId);
  }

  /**
   * Get document by key
   * GET /documents/key/:key
   */
  @Get('key/:key')
  async getDocumentByKey(
    @Param('key') key: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentResponseDto> {
    return this.documentService.getDocumentByKey(key, user.userId);
  }

  /**
   * Update document
   * PUT /documents/:id
   */
  @Put(':id')
  async updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentResponseDto> {
    return this.documentService.updateDocument(id, updateDto, user.userId);
  }

  /**
   * Delete document
   * DELETE /documents/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.documentService.deleteDocument(id, user.userId);
  }

  /**
   * Get documents by owner
   * GET /documents/owner/:ownerId
   */
  @Get('owner/:ownerId')
  async getDocumentsByOwner(
    @Param('ownerId', ParseIntPipe) ownerId: number,
  ): Promise<DocumentResponseDto[]> {
    return this.documentService.getDocumentsByOwner(ownerId);
  }

  /**
   * Get my documents
   * GET /documents/me
   */
  @Get('me')
  async getMyDocuments(@CurrentUser() user: JwtPayload): Promise<DocumentResponseDto[]> {
    return this.documentService.getDocumentsByOwner(user.userId);
  }

  /**
   * Get shared documents
   * GET /documents/shared
   */
  @Get('shared')
  async getSharedDocuments(@CurrentUser() user: JwtPayload): Promise<DocumentResponseDto[]> {
    return this.documentService.getSharedDocuments(user.userId);
  }

  // ========== File Operations ==========

  /**
   * Download document
   * GET /documents/:id/download
   */
  @Get(':id/download')
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const document = await this.documentService.getDocumentById(id, user.userId);
    // TODO: Implement actual file download
    // For now, return document metadata
    res.json(document);
  }

  // ========== Version Management ==========

  /**
   * Create new version
   * POST /documents/:id/versions
   */
  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async createVersion(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('changeDescription') changeDescription: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentVersionResponseDto> {
    return this.documentService.createVersion(
      id,
      file,
      changeDescription || 'New version',
      user.userId,
    );
  }

  /**
   * Get document versions
   * GET /documents/:id/versions
   */
  @Get(':id/versions')
  async getDocumentVersions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DocumentVersionResponseDto[]> {
    return this.documentService.getDocumentVersions(id);
  }

  /**
   * Get document version
   * GET /documents/:id/versions/:versionNumber
   */
  @Get(':id/versions/:versionNumber')
  async getDocumentVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ): Promise<DocumentVersionResponseDto> {
    return this.documentService.getDocumentVersion(id, versionNumber);
  }

  // ========== Sharing ==========

  /**
   * Share document
   * POST /documents/:id/share
   */
  @Post(':id/share')
  @HttpCode(HttpStatus.CREATED)
  async shareDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() shareDto: ShareDocumentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentShareResponseDto> {
    return this.documentService.shareDocument(id, shareDto, user.userId);
  }

  /**
   * Get document shares
   * GET /documents/:id/shares
   */
  @Get(':id/shares')
  async getDocumentShares(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DocumentShareResponseDto[]> {
    return this.documentService.getDocumentShares(id);
  }

  /**
   * Revoke share
   * DELETE /documents/shares/:shareId
   */
  @Delete('shares/:shareId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeShare(@Param('shareId', ParseIntPipe) shareId: number): Promise<void> {
    return this.documentService.revokeShare(shareId);
  }
}
