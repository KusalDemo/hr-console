import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldService } from './services';
import { CustomFieldDefinitionRepository, CustomFieldValueRepository } from './repositories';
import { CustomFieldDefinition, CustomFieldValue } from './entities';

/**
 * Custom Fields Module
 *
 * Provides custom field framework for dynamic field definitions and values
 * across all entity types in the system.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldDefinition, CustomFieldValue])],
  controllers: [CustomFieldsController],
  providers: [CustomFieldService, CustomFieldDefinitionRepository, CustomFieldValueRepository],
  exports: [CustomFieldService, CustomFieldDefinitionRepository, CustomFieldValueRepository],
})
export class CustomFieldsModule {}

