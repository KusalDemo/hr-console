import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GdprController } from './gdpr.controller';
import {
  DataSubjectRequest,
  Consent,
  PrivacyPolicyAcceptance,
} from './entities';
import {
  DataSubjectRequestRepository,
  ConsentRepository,
  PrivacyPolicyAcceptanceRepository,
} from './repositories';
import { GdprService, DataExportService } from './services';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * GDPR Module
 * 
 * Provides GDPR compliance features:
 * - Data subject requests (access, deletion, portability, rectification, restriction)
 * - Consent management and tracking
 * - Privacy policy acceptance tracking
 * - Data export for portability
 * - Data deletion and anonymization
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataSubjectRequest,
      Consent,
      PrivacyPolicyAcceptance,
      User,
      Organization,
    ]),
  ],
  controllers: [GdprController],
  providers: [
    // Services
    GdprService,
    DataExportService,
    // Repositories
    DataSubjectRequestRepository,
    ConsentRepository,
    PrivacyPolicyAcceptanceRepository,
  ],
  exports: [
    // Export services for use in other modules
    GdprService,
    DataExportService,
    // Export repositories
    DataSubjectRequestRepository,
    ConsentRepository,
    PrivacyPolicyAcceptanceRepository,
  ],
})
export class GdprModule {}
