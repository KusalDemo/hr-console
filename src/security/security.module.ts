import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityController } from './security.controller';
import {
  PasswordPolicy,
  MfaConfiguration,
  Session,
  FailedLoginAttempt,
  IpWhitelist,
  SecurityAuditLog,
} from './entities';
import {
  PasswordPolicyRepository,
  MfaConfigurationRepository,
  SessionRepository,
  FailedLoginAttemptRepository,
  IpWhitelistRepository,
  SecurityAuditLogRepository,
} from './repositories';
import {
  MfaService,
  PasswordPolicyService,
  SessionService,
} from './services';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Security Module
 * 
 * Provides enterprise-grade security features:
 * - Multi-factor authentication (TOTP, SMS, Email)
 * - Password policies and validation
 * - Session management
 * - IP whitelisting
 * - Security audit logging
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PasswordPolicy,
      MfaConfiguration,
      Session,
      FailedLoginAttempt,
      IpWhitelist,
      SecurityAuditLog,
      User,
      Organization,
    ]),
    AuthModule, // For PasswordService
    EmailModule, // For email MFA codes
  ],
  controllers: [SecurityController],
  providers: [
    // Services
    MfaService,
    PasswordPolicyService,
    SessionService,
    // Repositories
    PasswordPolicyRepository,
    MfaConfigurationRepository,
    SessionRepository,
    FailedLoginAttemptRepository,
    IpWhitelistRepository,
    SecurityAuditLogRepository,
  ],
  exports: [
    // Export services for use in other modules
    MfaService,
    PasswordPolicyService,
    SessionService,
    // Export repositories
    PasswordPolicyRepository,
    MfaConfigurationRepository,
    SessionRepository,
    FailedLoginAttemptRepository,
    IpWhitelistRepository,
    SecurityAuditLogRepository,
  ],
})
export class SecurityModule {}
