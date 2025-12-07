import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../../config/config.service';
import { IsStrongPassword } from '../../common/validators/password.validator';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Service for password hashing and validation
 * Uses bcrypt with configurable rounds (default: 12)
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly bcryptRounds: number;

  constructor(private readonly configService: AppConfigService) {
    const rounds = configService.bcryptRounds;
    // Validate rounds is a valid number
    if (typeof rounds !== 'number' || isNaN(rounds) || rounds < 4 || rounds > 31) {
      this.logger.error(`Invalid bcrypt rounds from config: ${rounds} (type: ${typeof rounds})`);
      throw new Error(`Invalid bcrypt rounds: ${rounds}. Must be between 4 and 31.`);
    }
    this.bcryptRounds = rounds;
    this.logger.log(`PasswordService initialized with bcrypt rounds: ${this.bcryptRounds}`);
  }

  /**
   * Hash a password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    // Ensure bcryptRounds is valid before hashing
    if (typeof this.bcryptRounds !== 'number' || isNaN(this.bcryptRounds)) {
      throw new Error(`Invalid bcrypt rounds: ${this.bcryptRounds}`);
    }

    // Ensure rounds is within valid range and is definitely a number
    const rounds = Math.max(4, Math.min(31, Math.floor(Number(this.bcryptRounds))));

    this.logger.debug(`Hashing password with rounds: ${rounds} (type: ${typeof rounds})`);

    try {
      // Use genSalt first to ensure proper salt generation, then hash
      const salt = await bcrypt.genSalt(rounds);
      this.logger.debug(`Generated salt: ${salt.substring(0, 20)}...`);
      const hash = await bcrypt.hash(password, salt);
      this.logger.debug(`Password hashed successfully`);
      return hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to hash password: ${errorMessage}. Rounds: ${rounds}, Type: ${typeof rounds}, Password length: ${password.length}`,
      );
      throw new Error(`Failed to hash password: ${errorMessage}`);
    }
  }

  /**
   * Verify a password against a hash
   * @param password - Plain text password
   * @param hash - Bcrypt hash
   * @returns True if password matches hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      const result = await bcrypt.compare(password, hash);
      return result;
    } catch (error) {
      this.logger.error(
        `[DEBUG] PasswordService.verifyPassword - Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Validation result with errors
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      return {
        isValid: false,
        errors: ['Password is required'],
      };
    }

    // Minimum 8 characters
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // At least one number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // At least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Maximum length check (prevent DoS attacks)
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password meets strength requirements
   * Uses the same validation as IsStrongPassword validator
   */
  isStrongPassword(password: string): boolean {
    const result = this.validatePasswordStrength(password);
    return result.isValid;
  }

  /**
   * Generate a random secure password
   * @param length - Password length (default: 16)
   * @returns Random secure password
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one character from each category
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Check if a hash needs to be rehashed (e.g., if rounds changed)
   * @param hash - Bcrypt hash to check
   * @returns True if hash should be rehashed
   */
  needsRehash(hash: string): boolean {
    if (!hash || !hash.startsWith('$2')) {
      return true;
    }

    // Extract rounds from hash (format: $2a$rounds$...)
    const parts = hash.split('$');
    if (parts.length < 3) {
      return true;
    }

    const rounds = parseInt(parts[2], 10);
    return rounds < this.bcryptRounds;
  }
}
