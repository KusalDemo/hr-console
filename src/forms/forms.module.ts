import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormsController } from './forms.controller';
import { FormService, FormValidationService } from './services';
import {
  FormDefinitionRepository,
  FormResponseRepository,
} from './repositories';
import { FormDefinition, FormResponse } from './entities';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Forms Module
 * 
 * Provides dynamic form creation and response management:
 * - Form definition CRUD operations
 * - Form templates and cloning
 * - Form versioning
 * - Form publishing
 * - Form response submission (anonymous and authenticated)
 * - Response management and status workflow
 * - Form validation (schema and response validation)
 * - Conditional logic support
 * - Form analytics
 * - Workflow integration
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormDefinition,
      FormResponse,
      Organization,
    ]),
  ],
  controllers: [FormsController],
  providers: [
    FormService,
    FormValidationService,
    FormDefinitionRepository,
    FormResponseRepository,
  ],
  exports: [
    FormService,
    FormValidationService,
    FormDefinitionRepository,
    FormResponseRepository,
  ],
})
export class FormsModule {}
