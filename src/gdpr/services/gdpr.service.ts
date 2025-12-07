import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DataSubjectRequest,
  RequestType,
  RequestStatus,
  Priority,
  DataSubjectType,
  VerificationStatus,
} from '../entities/data-subject-request.entity';
import { Consent, ConsentStatus, ConsentType } from '../entities/consent.entity';
import { PrivacyPolicyAcceptance, PolicyType } from '../entities/privacy-policy-acceptance.entity';
import { User } from '../../users/entities/user.entity';
import { DataExportService } from './data-export.service';
import * as crypto from 'crypto';

/**
 * GDPR Service
 *
 * Handles GDPR compliance operations:
 * - Data subject requests (access, deletion, portability, rectification, restriction)
 * - Request verification and processing
 * - Data deletion and anonymization
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);
  private readonly GDPR_RESPONSE_DAYS = 30; // GDPR requires response within 30 days

  constructor(
    @InjectRepository(DataSubjectRequest)
    private dataSubjectRequestRepository: Repository<DataSubjectRequest>,
    @InjectRepository(Consent)
    private consentRepository: Repository<Consent>,
    @InjectRepository(PrivacyPolicyAcceptance)
    private privacyPolicyAcceptanceRepository: Repository<PrivacyPolicyAcceptance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataExportService: DataExportService,
  ) {}

  /**
   * Create a data subject request
   */
  async createDataSubjectRequest(
    requestType: RequestType,
    dataSubjectEmail: string,
    dataSubjectName?: string,
    dataSubjectIdentifier?: string,
    dataSubjectType?: DataSubjectType,
    description?: string,
    createdById?: number,
  ): Promise<DataSubjectRequest> {
    const requestKey = this.generateRequestKey();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.GDPR_RESPONSE_DAYS);

    const request = this.dataSubjectRequestRepository.create({
      requestKey,
      requestType,
      requestStatus: RequestStatus.PENDING,
      priority: Priority.NORMAL,
      dataSubjectEmail,
      dataSubjectName: dataSubjectName || null,
      dataSubjectIdentifier: dataSubjectIdentifier || null,
      dataSubjectType: dataSubjectType || DataSubjectType.USER,
      description: description || null,
      verificationStatus: VerificationStatus.PENDING,
      dueDate,
      createdById: createdById || null,
    });

    return this.dataSubjectRequestRepository.save(request);
  }

  /**
   * Get data subject request by key
   */
  async getRequestByKey(requestKey: string): Promise<DataSubjectRequest | null> {
    return this.dataSubjectRequestRepository.findOne({
      where: { requestKey },
    });
  }

  /**
   * Verify data subject request
   */
  async verifyRequest(
    requestId: number,
    verificationMethod: string,
    verificationData: Record<string, any>,
  ): Promise<void> {
    const request = await this.dataSubjectRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Data subject request not found');
    }

    // TODO: Implement verification logic based on verification method
    // For email: send verification code
    // For ID document: verify document hash
    // For phone: send SMS code

    request.verificationStatus = VerificationStatus.VERIFIED;
    request.verificationMethod = verificationMethod as any;
    request.verificationData = verificationData;
    await this.dataSubjectRequestRepository.save(request);
  }

  /**
   * Process access request
   */
  async processAccessRequest(requestId: number): Promise<string> {
    const request = await this.dataSubjectRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Data subject request not found');
    }

    if (request.requestType !== RequestType.ACCESS) {
      throw new Error('Request is not an access request');
    }

    request.requestStatus = RequestStatus.IN_PROGRESS;
    request.startedAt = new Date();
    await this.dataSubjectRequestRepository.save(request);

    try {
      // Export user data
      const identifier = request.dataSubjectIdentifier || request.dataSubjectEmail;
      if (!identifier) {
        throw new BadRequestException('Data subject identifier or email is required');
      }
      const exportPath = await this.dataExportService.exportUserData(
        identifier,
        request.dataSubjectType || DataSubjectType.USER,
      );

      request.requestStatus = RequestStatus.COMPLETED;
      request.completedAt = new Date();
      request.exportFilePath = exportPath;
      request.responseData = {
        exportedAt: new Date().toISOString(),
        format: 'JSON',
      };
      await this.dataSubjectRequestRepository.save(request);

      return exportPath;
    } catch (error) {
      this.logger.error('Error processing access request', error);
      request.requestStatus = RequestStatus.REJECTED;
      request.rejectionReason = 'Failed to export data';
      await this.dataSubjectRequestRepository.save(request);
      throw error;
    }
  }

  /**
   * Process deletion request (Right to be forgotten)
   */
  async processDeletionRequest(requestId: number): Promise<number> {
    const request = await this.dataSubjectRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Data subject request not found');
    }

    if (request.requestType !== RequestType.DELETION) {
      throw new Error('Request is not a deletion request');
    }

    request.requestStatus = RequestStatus.IN_PROGRESS;
    request.deletionStatus = 'IN_PROGRESS';
    request.startedAt = new Date();
    await this.dataSubjectRequestRepository.save(request);

    try {
      // Delete user data
      const identifier = request.dataSubjectIdentifier || request.dataSubjectEmail;
      if (!identifier) {
        throw new BadRequestException('Data subject identifier or email is required');
      }
      const deletedCount = await this.deleteUserData(
        identifier,
        request.dataSubjectType || DataSubjectType.USER,
      );

      request.requestStatus = RequestStatus.COMPLETED;
      request.completedAt = new Date();
      request.deletionStatus = 'COMPLETED';
      request.deletedRecordsCount = deletedCount;
      await this.dataSubjectRequestRepository.save(request);

      return deletedCount;
    } catch (error) {
      this.logger.error('Error processing deletion request', error);
      request.requestStatus = RequestStatus.REJECTED;
      request.deletionStatus = 'FAILED';
      request.rejectionReason = 'Failed to delete data';
      await this.dataSubjectRequestRepository.save(request);
      throw error;
    }
  }

  /**
   * Process anonymization request
   */
  async processAnonymizationRequest(requestId: number): Promise<number> {
    const request = await this.dataSubjectRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Data subject request not found');
    }

    request.requestStatus = RequestStatus.IN_PROGRESS;
    request.anonymizationStatus = 'IN_PROGRESS';
    request.startedAt = new Date();
    await this.dataSubjectRequestRepository.save(request);

    try {
      // Anonymize user data
      const identifier = request.dataSubjectIdentifier || request.dataSubjectEmail;
      if (!identifier) {
        throw new BadRequestException('Data subject identifier or email is required');
      }
      const anonymizedCount = await this.anonymizeUserData(
        identifier,
        request.dataSubjectType || DataSubjectType.USER,
      );

      request.requestStatus = RequestStatus.COMPLETED;
      request.completedAt = new Date();
      request.anonymizationStatus = 'COMPLETED';
      request.anonymizedRecordsCount = anonymizedCount;
      await this.dataSubjectRequestRepository.save(request);

      return anonymizedCount;
    } catch (error) {
      this.logger.error('Error processing anonymization request', error);
      request.requestStatus = RequestStatus.REJECTED;
      request.anonymizationStatus = 'FAILED';
      request.rejectionReason = 'Failed to anonymize data';
      await this.dataSubjectRequestRepository.save(request);
      throw error;
    }
  }

  /**
   * Record consent
   */
  async recordConsent(
    dataSubjectEmail: string,
    consentType: ConsentType,
    consentCategory: string,
    consentPurpose?: string,
    dataSubjectId?: number,
    dataSubjectType?: DataSubjectType,
    organizationId?: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Consent> {
    const consentKey = this.generateConsentKey();
    const consent = this.consentRepository.create({
      consentKey,
      dataSubjectEmail,
      dataSubjectId: dataSubjectId || null,
      dataSubjectType: (dataSubjectType || DataSubjectType.USER) as any,
      consentType,
      consentCategory,
      consentPurpose: consentPurpose || null,
      consentStatus: ConsentStatus.GIVEN,
      givenAt: new Date(),
      organizationId: organizationId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      consentRecordHash: this.hashConsentRecord(consentKey, dataSubjectEmail, consentType),
    });

    return this.consentRepository.save(consent) as Promise<Consent>;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    consentId: number,
    withdrawalReason?: string,
    withdrawalMethod?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const consent = await this.consentRepository.findOne({
      where: { id: consentId },
    });

    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    consent.consentStatus = ConsentStatus.WITHDRAWN;
    consent.withdrawnAt = new Date();
    consent.withdrawalReason = withdrawalReason || null;
    consent.withdrawalMethod = withdrawalMethod || null;
    consent.withdrawalIpAddress = ipAddress || null;
    consent.withdrawalUserAgent = userAgent || null;

    await this.consentRepository.save(consent);
  }

  /**
   * Record privacy policy acceptance
   */
  async recordPrivacyPolicyAcceptance(
    userId: number,
    policyType: PolicyType,
    policyVersion: string,
    acceptedVia?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PrivacyPolicyAcceptance> {
    const acceptance = this.privacyPolicyAcceptanceRepository.create({
      userId,
      policyType,
      policyVersion,
      acceptedVia: acceptedVia || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      acceptanceHash: this.hashAcceptance(userId, policyType, policyVersion),
    });

    return this.privacyPolicyAcceptanceRepository.save(acceptance);
  }

  /**
   * Get user consents
   */
  async getUserConsents(dataSubjectEmail: string, dataSubjectId?: number): Promise<Consent[]> {
    const where: any = { dataSubjectEmail };
    if (dataSubjectId) {
      where.dataSubjectId = dataSubjectId;
    }

    return this.consentRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get user privacy policy acceptances
   */
  async getUserPrivacyPolicyAcceptances(userId: number): Promise<PrivacyPolicyAcceptance[]> {
    return this.privacyPolicyAcceptanceRepository.find({
      where: { userId },
      order: { acceptedAt: 'DESC' },
    });
  }

  // Private helper methods

  private generateRequestKey(): string {
    return `DSR-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateConsentKey(): string {
    return `CONSENT-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private hashConsentRecord(consentKey: string, email: string, consentType: ConsentType): string {
    const data = `${consentKey}:${email}:${consentType}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private hashAcceptance(userId: number, policyType: PolicyType, policyVersion: string): string {
    const data = `${userId}:${policyType}:${policyVersion}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async deleteUserData(
    identifier: string,
    dataSubjectType: DataSubjectType,
  ): Promise<number> {
    // TODO: Implement comprehensive data deletion
    // This should delete data from all relevant tables
    // For now, basic implementation
    let deletedCount = 0;

    if (dataSubjectType === DataSubjectType.USER) {
      const user = await this.userRepository.findOne({
        where: [{ email: identifier }, { id: parseInt(identifier, 10) }],
      });

      if (user) {
        // Anonymize user data instead of hard delete (for audit purposes)
        user.email = `deleted-${user.id}@deleted.local`;
        user.fullName = 'Deleted User';
        user.active = false;
        await this.userRepository.save(user);
        deletedCount = 1;
      }
    }

    return deletedCount;
  }

  private async anonymizeUserData(
    identifier: string,
    dataSubjectType: DataSubjectType,
  ): Promise<number> {
    // TODO: Implement comprehensive data anonymization
    // This should anonymize PII in all relevant tables
    let anonymizedCount = 0;

    if (dataSubjectType === DataSubjectType.USER) {
      const user = await this.userRepository.findOne({
        where: [{ email: identifier }, { id: parseInt(identifier, 10) }],
      });

      if (user) {
        user.email = `anonymous-${user.id}@anonymous.local`;
        user.fullName = 'Anonymous User';
        await this.userRepository.save(user);
        anonymizedCount = 1;
      }
    }

    return anonymizedCount;
  }
}
