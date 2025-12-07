import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentService, DocumentStorageService } from './services';
import {
  DocumentRepository,
  DocumentVersionRepository,
  DocumentShareRepository,
} from './repositories';
import { Document, DocumentVersion, DocumentShare } from './entities';
import { Employee } from '../employees/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Documents Module
 * 
 * Provides document management with:
 * - File storage with versioning
 * - Document sharing and permissions
 * - Document lifecycle management
 * - Categories and tagging
 * - Cloud storage integration (structure)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      DocumentShare,
      Employee,
      Organization,
    ]),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentService,
    DocumentStorageService,
    DocumentRepository,
    DocumentVersionRepository,
    DocumentShareRepository,
  ],
  exports: [
    DocumentService,
    DocumentStorageService,
    DocumentRepository,
    DocumentVersionRepository,
    DocumentShareRepository,
  ],
})
export class DocumentsModule {}
