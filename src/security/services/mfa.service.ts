import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MfaConfiguration, MfaType } from '../entities/mfa-configuration.entity';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../email/email.service';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

/**
 * MFA Service
 *
 * Provides multi-factor authentication functionality:
 * - TOTP (Time-based One-Time Password) using authenticator apps
 * - SMS codes (requires SMS service integration)
 * - Email codes
 *
 * Note: For TOTP, install: npm install speakeasy qrcode @types/qrcode
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly TOTP_WINDOW = 2; // Accept codes within ±2 time steps (60 seconds each)

  constructor(
    @InjectRepository(MfaConfiguration)
    private mfaConfigRepository: Repository<MfaConfiguration>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  /**
   * Generate TOTP secret and QR code for setup
   * @param userId - User ID
   * @param issuer - TOTP issuer name (default: 'HR System')
   * @returns Secret and QR code data URL
   */
  async generateTotpSecret(
    userId: number,
    issuer: string = 'HR System',
  ): Promise<{ secret: string; qrCode: string }> {
    // Generate a random secret (32 bytes, base32 encoded)
    const secret = this.generateSecret();

    // Get user for email
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create or update MFA configuration
    let mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType: MfaType.TOTP },
    });

    if (!mfaConfig) {
      mfaConfig = this.mfaConfigRepository.create({
        userId,
        mfaType: MfaType.TOTP,
        totpSecret: secret,
        totpIssuer: issuer,
        isEnabled: false,
        isActive: true,
      });
    } else {
      mfaConfig.totpSecret = secret;
      mfaConfig.totpIssuer = issuer;
    }

    await this.mfaConfigRepository.save(mfaConfig);

    // Generate QR code
    const otpAuthUrl = this.generateOtpAuthUrl(user.email, issuer, secret);
    let qrCode: string;
    try {
      qrCode = await QRCode.toDataURL(otpAuthUrl);
    } catch (error) {
      this.logger.error('Failed to generate QR code', error);
      qrCode = ''; // Return empty if QR code generation fails
    }

    return {
      secret,
      qrCode,
    };
  }

  /**
   * Verify TOTP code
   * @param userId - User ID
   * @param code - TOTP code to verify
   * @returns True if code is valid
   */
  async verifyTotpCode(userId: number, code: string): Promise<boolean> {
    const mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType: MfaType.TOTP, isActive: true },
    });

    if (!mfaConfig || !mfaConfig.totpSecret || !mfaConfig.isEnabled) {
      return false;
    }

    // Check if MFA is locked
    if (mfaConfig.lockedUntil && mfaConfig.lockedUntil > new Date()) {
      this.logger.warn(`MFA locked for user ${userId} until ${mfaConfig.lockedUntil}`);
      return false;
    }

    // Verify TOTP code
    // Note: This requires speakeasy library: npm install speakeasy @types/speakeasy
    // For now, using a placeholder implementation
    const isValid = this.verifyTotp(mfaConfig.totpSecret, code);

    if (isValid) {
      // Reset failed attempts
      mfaConfig.failedAttempts = 0;
      mfaConfig.lockedUntil = null;
      mfaConfig.lastUsedAt = new Date();
      await this.mfaConfigRepository.save(mfaConfig);
    } else {
      // Increment failed attempts
      mfaConfig.failedAttempts += 1;
      if (mfaConfig.failedAttempts >= 5) {
        // Lock for 30 minutes
        mfaConfig.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await this.mfaConfigRepository.save(mfaConfig);
    }

    return isValid;
  }

  /**
   * Enable MFA for a user
   * @param userId - User ID
   * @param mfaType - MFA type to enable
   * @param verificationCode - Verification code to confirm setup
   */
  async enableMfa(userId: number, mfaType: MfaType, verificationCode?: string): Promise<void> {
    const mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType, isActive: true },
    });

    if (!mfaConfig) {
      throw new NotFoundException('MFA configuration not found. Please set up MFA first.');
    }

    // Verify code if provided
    if (verificationCode) {
      let isValid = false;
      if (mfaType === MfaType.TOTP) {
        isValid = await this.verifyTotpCode(userId, verificationCode);
      } else if (mfaType === MfaType.EMAIL) {
        isValid = await this.verifyEmailCode(userId, verificationCode);
      } else if (mfaType === MfaType.SMS) {
        isValid = await this.verifySmsCode(userId, verificationCode);
      }

      if (!isValid) {
        throw new Error('Invalid verification code');
      }
    }

    // Enable MFA
    mfaConfig.isEnabled = true;
    mfaConfig.verifiedAt = new Date();
    await this.mfaConfigRepository.save(mfaConfig);

    // Update user MFA enabled flag
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.mfaEnabled = true;
      await this.userRepository.save(user);
    }

    // Generate backup codes
    await this.generateBackupCodes(userId, mfaType);
  }

  /**
   * Disable MFA for a user
   * @param userId - User ID
   * @param mfaType - MFA type to disable
   */
  async disableMfa(userId: number, mfaType: MfaType): Promise<void> {
    const mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType, isActive: true },
    });

    if (mfaConfig) {
      mfaConfig.isEnabled = false;
      mfaConfig.isActive = false;
      await this.mfaConfigRepository.save(mfaConfig);
    }

    // Check if user has any other active MFA
    const activeMfa = await this.mfaConfigRepository.find({
      where: { userId, isEnabled: true, isActive: true },
    });

    // Update user MFA enabled flag
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.mfaEnabled = activeMfa.length > 0;
      await this.userRepository.save(user);
    }
  }

  /**
   * Send email verification code
   * @param userId - User ID
   */
  async sendEmailCode(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate 6-digit code
    const code = this.generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create or update MFA configuration
    let mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType: MfaType.EMAIL },
    });

    if (!mfaConfig) {
      mfaConfig = this.mfaConfigRepository.create({
        userId,
        mfaType: MfaType.EMAIL,
        isEnabled: false,
        isActive: true,
      });
    }

    // Store code in metadata (in production, use Redis with expiration)
    mfaConfig.metadata = {
      ...mfaConfig.metadata,
      emailCode: code,
      emailCodeExpiresAt: expiresAt.toISOString(),
    };
    await this.mfaConfigRepository.save(mfaConfig);

    // Send email
    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Your MFA Verification Code',
      text: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });
  }

  /**
   * Verify email code
   * @param userId - User ID
   * @param code - Email code to verify
   * @returns True if code is valid
   */
  async verifyEmailCode(userId: number, code: string): Promise<boolean> {
    const mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType: MfaType.EMAIL, isActive: true },
    });

    if (!mfaConfig || !mfaConfig.metadata) {
      return false;
    }

    const storedCode = mfaConfig.metadata.emailCode;
    const expiresAt = mfaConfig.metadata.emailCodeExpiresAt
      ? new Date(mfaConfig.metadata.emailCodeExpiresAt)
      : null;

    if (!storedCode || !expiresAt || expiresAt < new Date()) {
      return false;
    }

    if (storedCode === code) {
      // Clear code
      delete mfaConfig.metadata.emailCode;
      delete mfaConfig.metadata.emailCodeExpiresAt;
      mfaConfig.emailVerified = true;
      mfaConfig.lastUsedAt = new Date();
      await this.mfaConfigRepository.save(mfaConfig);
      return true;
    }

    return false;
  }

  /**
   * Send SMS verification code
   * @param userId - User ID
   * @param phoneNumber - Phone number to send code to
   */
  async sendSmsCode(userId: number, phoneNumber: string): Promise<void> {
    // Generate 6-digit code
    const code = this.generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create or update MFA configuration
    let mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType: MfaType.SMS },
    });

    if (!mfaConfig) {
      mfaConfig = this.mfaConfigRepository.create({
        userId,
        mfaType: MfaType.SMS,
        phoneNumber,
        isEnabled: false,
        isActive: true,
      });
    } else {
      mfaConfig.phoneNumber = phoneNumber;
    }

    // Store code in metadata (in production, use Redis with expiration)
    mfaConfig.metadata = {
      ...mfaConfig.metadata,
      smsCode: code,
      smsCodeExpiresAt: expiresAt.toISOString(),
    };
    await this.mfaConfigRepository.save(mfaConfig);

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    this.logger.log(`SMS code for user ${userId}: ${code} (expires at ${expiresAt})`);
    // In production: await this.smsService.sendSms(phoneNumber, `Your verification code is: ${code}`);
  }

  /**
   * Verify SMS code
   * @param userId - User ID
   * @param code - SMS code to verify
   * @returns True if code is valid
   */
  async verifySmsCode(userId: number, code: string): Promise<boolean> {
    const mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType: MfaType.SMS, isActive: true },
    });

    if (!mfaConfig || !mfaConfig.metadata) {
      return false;
    }

    const storedCode = mfaConfig.metadata.smsCode;
    const expiresAt = mfaConfig.metadata.smsCodeExpiresAt
      ? new Date(mfaConfig.metadata.smsCodeExpiresAt)
      : null;

    if (!storedCode || !expiresAt || expiresAt < new Date()) {
      return false;
    }

    if (storedCode === code) {
      // Clear code
      delete mfaConfig.metadata.smsCode;
      delete mfaConfig.metadata.smsCodeExpiresAt;
      mfaConfig.phoneVerified = true;
      mfaConfig.lastUsedAt = new Date();
      await this.mfaConfigRepository.save(mfaConfig);
      return true;
    }

    return false;
  }

  /**
   * Generate backup codes
   * @param userId - User ID
   * @param mfaType - MFA type
   * @returns Backup codes
   */
  async generateBackupCodes(userId: number, mfaType: MfaType): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(this.generateBackupCode());
    }

    const mfaConfig = await this.mfaConfigRepository.findOne({
      where: { userId, mfaType, isActive: true },
    });

    if (mfaConfig) {
      // Hash backup codes before storing
      const hashedCodes = codes.map((code) => this.hashCode(code));
      mfaConfig.backupCodes = hashedCodes;
      mfaConfig.backupCodesUsed = [];
      await this.mfaConfigRepository.save(mfaConfig);
    }

    return codes; // Return plain codes for user to save
  }

  /**
   * Verify backup code
   * @param userId - User ID
   * @param code - Backup code to verify
   * @returns True if code is valid
   */
  async verifyBackupCode(userId: number, code: string): Promise<boolean> {
    const mfaConfigs = await this.mfaConfigRepository.find({
      where: { userId, isEnabled: true, isActive: true },
    });

    for (const config of mfaConfigs) {
      if (!config.backupCodes || config.backupCodes.length === 0) {
        continue;
      }

      const hashedCode = this.hashCode(code);
      const index = config.backupCodes.indexOf(hashedCode);

      if (index !== -1) {
        // Mark code as used
        if (!config.backupCodesUsed) {
          config.backupCodesUsed = [];
        }
        config.backupCodesUsed.push(hashedCode);
        config.backupCodes = config.backupCodes.filter((_, i) => i !== index);
        await this.mfaConfigRepository.save(config);
        return true;
      }
    }

    return false;
  }

  /**
   * Get MFA configuration for user
   * @param userId - User ID
   * @returns MFA configurations
   */
  async getMfaConfigurations(userId: number): Promise<MfaConfiguration[]> {
    return this.mfaConfigRepository.find({
      where: { userId, isActive: true },
    });
  }

  // Private helper methods

  private generateSecret(): string {
    // Generate 32 random bytes and encode as base32
    const bytes = crypto.randomBytes(32);
    return this.base32Encode(bytes);
  }

  private base32Encode(buffer: Buffer): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        result += base32Chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += base32Chars[(value << (5 - bits)) & 31];
    }

    return result;
  }

  private generateOtpAuthUrl(email: string, issuer: string, secret: string): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  }

  private verifyTotp(secret: string, code: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: this.TOTP_WINDOW,
      });
    } catch (error) {
      this.logger.error('TOTP verification error', error);
      return false;
    }
  }

  private generateNumericCode(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const code = Math.floor(Math.random() * (max - min + 1)) + min;
    return code.toString();
  }

  private generateBackupCode(): string {
    // Generate 8-character alphanumeric backup code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private hashCode(code: string): string {
    // Hash code using SHA-256
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

