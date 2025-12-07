import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordPolicy } from '../entities/password-policy.entity';
import { PasswordService } from '../../auth/services/password.service';

/**
 * Password Policy Service
 *
 * Manages configurable password rules for security compliance.
 * Validates passwords against policies and enforces password history.
 */
@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);

  constructor(
    @InjectRepository(PasswordPolicy)
    private passwordPolicyRepository: Repository<PasswordPolicy>,
    private passwordService: PasswordService,
  ) {}

  /**
   * Get default password policy
   */
  async getDefaultPolicy(): Promise<PasswordPolicy> {
    const policy = await this.passwordPolicyRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (!policy) {
      throw new NotFoundException('Default password policy not found');
    }

    return policy;
  }

  /**
   * Get password policy for organization
   * Falls back to default policy if no organization-specific policy exists
   */
  async getPolicyForOrganization(organizationId: number | null): Promise<PasswordPolicy> {
    if (organizationId) {
      const policy = await this.passwordPolicyRepository.findOne({
        where: { organizationId, isActive: true },
        order: { createdAt: 'DESC' },
      });

      if (policy) {
        return policy;
      }
    }

    return this.getDefaultPolicy();
  }

  /**
   * Validate password against policy
   */
  async validatePassword(
    password: string,
    policy: PasswordPolicy,
    username?: string,
    email?: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Length checks
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.maxLength && password.length > policy.maxLength) {
      errors.push(`Password must be no more than ${policy.maxLength} characters long`);
    }

    // Character requirements
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireDigits && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (policy.requireSpecialChars) {
      const specialChars = policy.specialCharsAllowed || '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const specialCharsRegex = new RegExp(
        `[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
      );
      if (!specialCharsRegex.test(password)) {
        errors.push('Password must contain at least one special character');
      }
    }

    // Disallow username/email
    if (
      policy.disallowUsername &&
      username &&
      password.toLowerCase().includes(username.toLowerCase())
    ) {
      errors.push('Password cannot contain your username');
    }

    if (policy.disallowEmail && email && password.toLowerCase().includes(email.toLowerCase())) {
      errors.push('Password cannot contain your email');
    }

    // Consecutive characters
    if (this.hasConsecutiveChars(password, policy.maxConsecutiveChars)) {
      errors.push(
        `Password cannot contain more than ${policy.maxConsecutiveChars} consecutive identical characters`,
      );
    }

    // Repeating characters
    if (this.hasRepeatingChars(password, policy.maxRepeatingChars)) {
      errors.push(
        `Password cannot contain more than ${policy.maxRepeatingChars} repeating characters`,
      );
    }

    // Common passwords
    if (
      policy.disallowCommonPasswords &&
      this.isCommonPassword(password, policy.commonPasswordsList)
    ) {
      errors.push('Password is too common. Please choose a more unique password');
    }

    // Password strength check
    if (policy.checkPasswordStrength) {
      const strengthResult = this.passwordService.validatePasswordStrength(password);
      if (!strengthResult.isValid) {
        errors.push(...strengthResult.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password should expire
   */
  shouldPasswordExpire(policy: PasswordPolicy, passwordChangedAt: Date | null): boolean {
    if (!policy.expirationDays || !passwordChangedAt) {
      return false;
    }

    const expirationDate = new Date(passwordChangedAt);
    expirationDate.setDate(expirationDate.getDate() + policy.expirationDays);

    return new Date() >= expirationDate;
  }

  /**
   * Get days until password expires
   */
  getDaysUntilExpiration(policy: PasswordPolicy, passwordChangedAt: Date | null): number | null {
    if (!policy.expirationDays || !passwordChangedAt) {
      return null;
    }

    const expirationDate = new Date(passwordChangedAt);
    expirationDate.setDate(expirationDate.getDate() + policy.expirationDays);

    const daysUntil = Math.ceil(
      (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysUntil > 0 ? daysUntil : 0;
  }

  /**
   * Check if password expiration warning should be shown
   */
  shouldShowExpirationWarning(policy: PasswordPolicy, passwordChangedAt: Date | null): boolean {
    const daysUntil = this.getDaysUntilExpiration(policy, passwordChangedAt);
    if (daysUntil === null) {
      return false;
    }

    return daysUntil <= policy.warningDaysBeforeExpiry && daysUntil > 0;
  }

  /**
   * Calculate lockout duration with escalation
   */
  calculateLockoutDuration(policy: PasswordPolicy, failedAttempts: number): number {
    if (!policy.lockoutEscalationEnabled) {
      return policy.lockoutDurationMinutes;
    }

    const multiplier = Math.pow(
      policy.lockoutEscalationMultiplier || 2.0,
      Math.floor(failedAttempts / policy.maxFailedAttempts),
    );

    return Math.min(
      policy.lockoutDurationMinutes * multiplier,
      24 * 60, // Max 24 hours
    );
  }

  // Private helper methods

  private hasConsecutiveChars(password: string, max: number): boolean {
    let consecutive = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        consecutive++;
        if (consecutive > max) {
          return true;
        }
      } else {
        consecutive = 1;
      }
    }
    return false;
  }

  private hasRepeatingChars(password: string, max: number): boolean {
    const charCounts: Record<string, number> = {};
    for (const char of password) {
      charCounts[char] = (charCounts[char] || 0) + 1;
      if (charCounts[char] > max) {
        return true;
      }
    }
    return false;
  }

  private isCommonPassword(password: string, commonPasswordsList: string[] | null): boolean {
    if (!commonPasswordsList || commonPasswordsList.length === 0) {
      // Default common passwords
      const defaultCommon = ['password', '12345678', 'password123', 'admin123', 'welcome123'];
      return defaultCommon.includes(password.toLowerCase());
    }

    return commonPasswordsList.includes(password.toLowerCase());
  }
}

