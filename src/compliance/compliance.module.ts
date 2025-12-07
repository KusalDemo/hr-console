import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller';
import {
  ComplianceFramework,
  ComplianceRequirement,
  ComplianceChecklist,
  ComplianceChecklistItem,
  ComplianceAudit,
  ComplianceAuditFinding,
  ComplianceEvidence,
  ComplianceAutomatedCheck,
  ComplianceCheckExecution,
} from './entities';
import {
  ComplianceFrameworkRepository,
  ComplianceRequirementRepository,
  ComplianceChecklistRepository,
  ComplianceAuditRepository,
  ComplianceEvidenceRepository,
} from './repositories';
import { ComplianceService } from './services';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Compliance Module
 *
 * Provides compliance tracking and reporting:
 * - Compliance frameworks (GDPR, HIPAA, SOC2, ISO27001, etc.)
 * - Compliance checklists and requirements tracking
 * - Compliance audits and findings
 * - Evidence collection and validation
 * - Automated compliance checks
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceFramework,
      ComplianceRequirement,
      ComplianceChecklist,
      ComplianceChecklistItem,
      ComplianceAudit,
      ComplianceAuditFinding,
      ComplianceEvidence,
      ComplianceAutomatedCheck,
      ComplianceCheckExecution,
      User,
      Organization,
    ]),
  ],
  controllers: [ComplianceController],
  providers: [
    // Services
    ComplianceService,
    // Repositories
    ComplianceFrameworkRepository,
    ComplianceRequirementRepository,
    ComplianceChecklistRepository,
    ComplianceAuditRepository,
    ComplianceEvidenceRepository,
  ],
  exports: [
    // Export services for use in other modules
    ComplianceService,
    // Export repositories
    ComplianceFrameworkRepository,
    ComplianceRequirementRepository,
    ComplianceChecklistRepository,
    ComplianceAuditRepository,
    ComplianceEvidenceRepository,
  ],
})
export class ComplianceModule {}

