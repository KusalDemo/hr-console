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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GdprService } from './services/gdpr.service';
import { DataExportService } from './services/data-export.service';
import { CreateDataSubjectRequestDto, RecordConsentDto } from './dto';
import { RequestType, DataSubjectType } from './entities/data-subject-request.entity';
import { ConsentType } from './entities/consent.entity';
import { PolicyType } from './entities/privacy-policy-acceptance.entity';

/**
 * GDPR Controller
 * 
 * Provides endpoints for GDPR compliance:
 * - Data subject requests (access, deletion, portability)
 * - Consent management
 * - Privacy policy acceptance
 * - Data export
 */
@Controller('gdpr')
@UseGuards(JwtAuthGuard)
export class GdprController {
  constructor(
    private readonly gdprService: GdprService,
    private readonly dataExportService: DataExportService,
  ) {}

  // ========== Data Subject Requests ==========

  /**
   * Create data subject request
   */
  @Post('requests')
  async createRequest(
    @Request() req: any,
    @Body() dto: CreateDataSubjectRequestDto,
  ) {
    const request = await this.gdprService.createDataSubjectRequest(
      dto.requestType,
      dto.dataSubjectEmail,
      dto.dataSubjectName,
      dto.dataSubjectIdentifier,
      dto.dataSubjectType || DataSubjectType.USER,
      dto.description,
      req.user.id,
    );

    return {
      requestKey: request.requestKey,
      requestType: request.requestType,
      requestStatus: request.requestStatus,
      dueDate: request.dueDate,
    };
  }

  /**
   * Get request by key
   */
  @Get('requests/:requestKey')
  async getRequest(@Param('requestKey') requestKey: string) {
    return this.gdprService.getRequestByKey(requestKey);
  }

  /**
   * Process access request
   */
  @Post('requests/:requestId/process-access')
  async processAccessRequest(@Param('requestId') requestId: number) {
    const exportPath = await this.gdprService.processAccessRequest(requestId);
    return { exportPath, message: 'Access request processed successfully' };
  }

  /**
   * Download exported data
   */
  @Get('requests/:requestId/download')
  async downloadExport(
    @Param('requestId') requestId: number,
    @Res() res: Response,
  ) {
    // TODO: Get request and return file
    res.status(200).json({ message: 'Download endpoint - implementation needed' });
  }

  /**
   * Process deletion request
   */
  @Post('requests/:requestId/process-deletion')
  async processDeletionRequest(@Param('requestId') requestId: number) {
    const deletedCount = await this.gdprService.processDeletionRequest(requestId);
    return {
      deletedCount,
      message: 'Deletion request processed successfully',
    };
  }

  /**
   * Process anonymization request
   */
  @Post('requests/:requestId/process-anonymization')
  async processAnonymizationRequest(@Param('requestId') requestId: number) {
    const anonymizedCount =
      await this.gdprService.processAnonymizationRequest(requestId);
    return {
      anonymizedCount,
      message: 'Anonymization request processed successfully',
    };
  }

  // ========== Consent Management ==========

  /**
   * Record consent
   */
  @Post('consents')
  async recordConsent(
    @Request() req: any,
    @Body() dto: RecordConsentDto,
  ) {
    const consent = await this.gdprService.recordConsent(
      dto.dataSubjectEmail,
      dto.consentType,
      dto.consentCategory,
      dto.consentPurpose,
      dto.dataSubjectId,
      dto.dataSubjectType || DataSubjectType.USER,
      dto.organizationId || null,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      consentKey: consent.consentKey,
      consentStatus: consent.consentStatus,
      givenAt: consent.givenAt,
    };
  }

  /**
   * Withdraw consent
   */
  @Put('consents/:consentId/withdraw')
  async withdrawConsent(
    @Request() req: any,
    @Param('consentId') consentId: number,
    @Body() dto: { reason?: string },
  ) {
    await this.gdprService.withdrawConsent(
      consentId,
      dto.reason,
      'WEB_FORM',
      req.ip,
      req.headers['user-agent'],
    );

    return { message: 'Consent withdrawn successfully' };
  }

  /**
   * Get user consents
   */
  @Get('consents')
  async getUserConsents(
    @Request() req: any,
    @Query('email') email?: string,
  ) {
    const userEmail = email || req.user.email;
    return this.gdprService.getUserConsents(userEmail, req.user.id);
  }

  // ========== Privacy Policy ==========

  /**
   * Record privacy policy acceptance
   */
  @Post('privacy-policy/accept')
  async acceptPrivacyPolicy(
    @Request() req: any,
    @Body() dto: { policyType: PolicyType; policyVersion: string },
  ) {
    const acceptance = await this.gdprService.recordPrivacyPolicyAcceptance(
      req.user.id,
      dto.policyType,
      dto.policyVersion,
      'WEB',
      req.ip,
      req.headers['user-agent'],
    );

    return {
      id: acceptance.id,
      policyType: acceptance.policyType,
      policyVersion: acceptance.policyVersion,
      acceptedAt: acceptance.acceptedAt,
    };
  }

  /**
   * Get user privacy policy acceptances
   */
  @Get('privacy-policy/acceptances')
  async getPrivacyPolicyAcceptances(@Request() req: any) {
    return this.gdprService.getUserPrivacyPolicyAcceptances(req.user.id);
  }
}
