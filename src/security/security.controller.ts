import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaService } from './services/mfa.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { SessionService } from './services/session.service';
import { SetupMfaDto, VerifyMfaDto } from './dto';
import { MfaType } from './entities/mfa-configuration.entity';

/**
 * Security Controller
 *
 * Provides endpoints for:
 * - MFA setup and verification
 * - Password policy management
 * - Session management
 */
@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly sessionService: SessionService,
  ) {}

  // ========== MFA Endpoints ==========

  /**
   * Setup MFA (TOTP)
   */
  @Post('mfa/setup/totp')
  async setupTotp(@Request() req: any) {
    const userId = req.user.id;
    const result = await this.mfaService.generateTotpSecret(userId);
    return {
      secret: result.secret,
      qrCode: result.qrCode,
    };
  }

  /**
   * Setup MFA (Email)
   */
  @Post('mfa/setup/email')
  async setupEmail(@Request() req: any) {
    const userId = req.user.id;
    await this.mfaService.sendEmailCode(userId);
    return { message: 'Verification code sent to your email' };
  }

  /**
   * Setup MFA (SMS)
   */
  @Post('mfa/setup/sms')
  async setupSms(@Request() req: any, @Body() dto: SetupMfaDto) {
    const userId = req.user.id;
    if (!dto.phoneNumber) {
      throw new Error('Phone number is required for SMS MFA');
    }
    await this.mfaService.sendSmsCode(userId, dto.phoneNumber);
    return { message: 'Verification code sent to your phone' };
  }

  /**
   * Verify MFA and enable
   */
  @Post('mfa/verify')
  async verifyMfa(@Request() req: any, @Body() dto: VerifyMfaDto & { mfaType: MfaType }) {
    const userId = req.user.id;
    const isValid = await this.mfaService.verifyTotpCode(userId, dto.code);
    if (isValid) {
      await this.mfaService.enableMfa(userId, dto.mfaType, dto.code);
      return { message: 'MFA enabled successfully' };
    }
    throw new Error('Invalid verification code');
  }

  /**
   * Disable MFA
   */
  @Delete('mfa/:mfaType')
  async disableMfa(@Request() req: any, @Param('mfaType') mfaType: MfaType) {
    const userId = req.user.id;
    await this.mfaService.disableMfa(userId, mfaType);
    return { message: 'MFA disabled successfully' };
  }

  /**
   * Get MFA configurations
   */
  @Get('mfa')
  async getMfaConfigurations(@Request() req: any) {
    const userId = req.user.id;
    return this.mfaService.getMfaConfigurations(userId);
  }

  /**
   * Generate backup codes
   */
  @Post('mfa/backup-codes')
  async generateBackupCodes(@Request() req: any, @Body() dto: { mfaType: MfaType }) {
    const userId = req.user.id;
    const codes = await this.mfaService.generateBackupCodes(userId, dto.mfaType);
    return { backupCodes: codes };
  }

  // ========== Session Endpoints ==========

  /**
   * Get active sessions
   */
  @Get('sessions')
  async getActiveSessions(@Request() req: any) {
    const userId = req.user.id;
    return this.sessionService.getActiveSessions(userId);
  }

  /**
   * Get session statistics
   */
  @Get('sessions/stats')
  async getSessionStats(@Request() req: any) {
    const userId = req.user.id;
    return this.sessionService.getSessionStats(userId);
  }

  /**
   * Revoke a session
   */
  @Delete('sessions/:sessionId')
  async revokeSession(@Request() req: any, @Param('sessionId') sessionId: number) {
    const userId = req.user.id;
    await this.sessionService.revokeSession(sessionId, userId);
    return { message: 'Session revoked successfully' };
  }

  /**
   * Revoke all other sessions
   */
  @Delete('sessions/others')
  async revokeOtherSessions(@Request() req: any) {
    const userId = req.user.id;
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (sessionToken) {
      await this.sessionService.revokeOtherSessions(userId, sessionToken, userId);
    }
    return { message: 'Other sessions revoked successfully' };
  }

  /**
   * Trust a device
   */
  @Put('sessions/:sessionId/trust')
  async trustDevice(@Request() req: any, @Param('sessionId') sessionId: number) {
    await this.sessionService.trustDevice(sessionId);
    return { message: 'Device trusted successfully' };
  }

  // ========== Password Policy Endpoints ==========

  /**
   * Get password policy
   */
  @Get('password-policy')
  async getPasswordPolicy(@Request() req: any, @Query('organizationId') organizationId?: number) {
    const orgId = organizationId ? parseInt(organizationId.toString(), 10) : null;
    return this.passwordPolicyService.getPolicyForOrganization(orgId);
  }

  /**
   * Validate password against policy
   */
  @Post('password-policy/validate')
  async validatePassword(
    @Request() req: any,
    @Body() dto: { password: string; organizationId?: number },
  ) {
    const policy = await this.passwordPolicyService.getPolicyForOrganization(
      dto.organizationId || null,
    );
    return this.passwordPolicyService.validatePassword(
      dto.password,
      policy,
      req.user.email,
      req.user.email,
    );
  }
}

