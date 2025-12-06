import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { AppConfigService } from '../config/config.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendTenantAdminWelcomeEmailDto } from './dto/send-tenant-admin-welcome-email.dto';

/**
 * Email error types for better error handling
 */
export enum EmailErrorType {
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom email error class
 */
export class EmailError extends Error {
  constructor(
    public readonly type: EmailErrorType,
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'EmailError';
  }
}

/**
 * Email Service
 * 
 * Handles all email sending operations using Nodemailer.
 * Supports SMTP configuration, email templates, retry logic, and error handling.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000; // Initial delay: 1 second
  private readonly maxRetryDelayMs: number = 10000; // Max delay: 10 seconds

  constructor(private readonly configService: AppConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter with SMTP configuration
   * Includes retry logic for connection verification
   */
  private initializeTransporter(): void {
    const smtpHost = this.configService.smtpHost;
    const smtpPort = this.configService.smtpPort;
    const smtpSecure = this.configService.smtpSecure;
    const smtpUser = this.configService.smtpUser;
    const smtpPassword = this.configService.smtpPassword;

    if (!smtpUser || !smtpPassword) {
      this.logger.warn(
        'SMTP credentials not configured. Email functionality will be disabled.',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        // Connection timeout
        connectionTimeout: 10000, // 10 seconds
        // Socket timeout
        socketTimeout: 10000, // 10 seconds
        // Greeting timeout
        greetingTimeout: 5000, // 5 seconds
      });

      this.logger.log(
        `SMTP transporter initialized: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`,
      );

      // Verify transporter configuration with retry
      this.verifyTransporterWithRetry();
    } catch (error) {
      this.logger.error(
        'Failed to initialize SMTP transporter:',
        error instanceof Error ? error.stack : String(error),
      );
      this.transporter = null;
    }
  }

  /**
   * Verify transporter connection with retry logic
   */
  private async verifyTransporterWithRetry(retryCount: number = 0): Promise<void> {
    if (!this.transporter) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.transporter!.verify((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `SMTP connection verification failed (attempt ${retryCount + 1}): ${errorMessage}`,
      );

      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const delay = this.retryDelayMs * Math.pow(2, retryCount);
        this.logger.log(`Retrying SMTP verification in ${delay}ms...`);
        setTimeout(() => {
          this.verifyTransporterWithRetry(retryCount + 1);
        }, delay);
      } else {
        this.logger.error(
          'SMTP connection verification failed after retries. Email sending may fail.',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Send a generic email with retry logic
   * 
   * @param sendEmailDto - Email sending parameters
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise resolving to message info
   * @throws EmailError with specific error type
   */
  async sendEmail(
    sendEmailDto: SendEmailDto,
    retryCount: number = 0,
  ): Promise<void> {
    if (!this.transporter) {
      const error = new EmailError(
        EmailErrorType.CONFIGURATION_ERROR,
        'Email transporter not initialized. Email service is not configured.',
      );
      this.logger.error(error.message);
      throw error;
    }

    // Validate email parameters
    this.validateEmailDto(sendEmailDto);

    const emailFrom = this.configService.emailFrom;
    const emailFromName = this.configService.emailFromName;

    const mailOptions = {
      from: emailFromName
        ? `${emailFromName} <${emailFrom}>`
        : emailFrom,
      to: sendEmailDto.to,
      subject: sendEmailDto.subject,
      text: sendEmailDto.text,
      html: sendEmailDto.html,
      cc: sendEmailDto.cc,
      bcc: sendEmailDto.bcc,
      replyTo: sendEmailDto.replyTo,
    };

    try {
      this.logger.debug(
        `Sending email to ${sendEmailDto.to} (attempt ${retryCount + 1}/${this.maxRetries + 1})`,
      );

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email sent successfully to ${sendEmailDto.to} (Message ID: ${info.messageId})`,
      );
    } catch (error) {
      const emailError = this.classifyError(error, sendEmailDto.to);

      // Retry logic for transient errors
      if (
        this.isRetryableError(emailError) &&
        retryCount < this.maxRetries
      ) {
        const delay = Math.min(
          this.retryDelayMs * Math.pow(2, retryCount),
          this.maxRetryDelayMs,
        );

        this.logger.warn(
          `Email send failed (attempt ${retryCount + 1}/${this.maxRetries + 1}). Retrying in ${delay}ms... Error: ${emailError.message}`,
        );

        // Wait before retry
        await this.sleep(delay);

        // Retry
        return this.sendEmail(sendEmailDto, retryCount + 1);
      }

      // Log final error
      this.logger.error(
        `Failed to send email to ${sendEmailDto.to} after ${retryCount + 1} attempts: ${emailError.message}`,
        emailError.originalError instanceof Error
          ? emailError.originalError.stack
          : undefined,
      );

      throw emailError;
    }
  }

  /**
   * Validate email DTO
   */
  private validateEmailDto(sendEmailDto: SendEmailDto): void {
    if (!sendEmailDto.to || !sendEmailDto.to.trim()) {
      throw new EmailError(
        EmailErrorType.VALIDATION_ERROR,
        'Recipient email address is required',
      );
    }

    if (!sendEmailDto.subject || !sendEmailDto.subject.trim()) {
      throw new EmailError(
        EmailErrorType.VALIDATION_ERROR,
        'Email subject is required',
      );
    }

    if (!sendEmailDto.text && !sendEmailDto.html) {
      throw new EmailError(
        EmailErrorType.VALIDATION_ERROR,
        'Email must have either text or HTML content',
      );
    }
  }

  /**
   * Classify error type based on error characteristics
   */
  private classifyError(error: unknown, recipient: string): EmailError {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorMessage = originalError.message.toLowerCase();
    const errorCode = (originalError as any).code?.toLowerCase() || '';

    // Connection errors
    if (
      errorCode === 'econnrefused' ||
      errorCode === 'etimedout' ||
      errorMessage.includes('connection') ||
      errorMessage.includes('connect econnrefused') ||
      errorMessage.includes('timeout')
    ) {
      return new EmailError(
        EmailErrorType.CONNECTION_ERROR,
        `Failed to connect to SMTP server: ${originalError.message}`,
        originalError,
      );
    }

    // Authentication errors
    if (
      errorCode === 'eauthentication' ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('invalid login') ||
      errorMessage.includes('username and password')
    ) {
      return new EmailError(
        EmailErrorType.AUTHENTICATION_ERROR,
        `SMTP authentication failed: ${originalError.message}`,
        originalError,
      );
    }

    // Validation errors
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('malformed') ||
      errorMessage.includes('address')
    ) {
      return new EmailError(
        EmailErrorType.VALIDATION_ERROR,
        `Invalid email parameters: ${originalError.message}`,
        originalError,
      );
    }

    // Network errors
    if (
      errorCode === 'enotfound' ||
      errorCode === 'eai_again' ||
      errorMessage.includes('dns') ||
      errorMessage.includes('network')
    ) {
      return new EmailError(
        EmailErrorType.NETWORK_ERROR,
        `Network error while sending email: ${originalError.message}`,
        originalError,
      );
    }

    // Timeout errors
    if (
      errorCode === 'etimeout' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out')
    ) {
      return new EmailError(
        EmailErrorType.TIMEOUT_ERROR,
        `Email send operation timed out: ${originalError.message}`,
        originalError,
      );
    }

    // Unknown error
    return new EmailError(
      EmailErrorType.UNKNOWN_ERROR,
      `Unexpected error while sending email: ${originalError.message}`,
      originalError,
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: EmailError): boolean {
    return (
      error.type === EmailErrorType.CONNECTION_ERROR ||
      error.type === EmailErrorType.NETWORK_ERROR ||
      error.type === EmailErrorType.TIMEOUT_ERROR
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send tenant admin welcome email with credentials
   * Includes enhanced logging and error handling
   * 
   * @param dto - Tenant admin welcome email data
   * @returns Promise resolving when email is sent
   * @throws EmailError if email sending fails
   */
  async sendTenantAdminWelcomeEmail(
    dto: SendTenantAdminWelcomeEmailDto,
  ): Promise<void> {
    this.logger.log(
      `Preparing to send welcome email to tenant admin: ${dto.tenantAdminEmail} (Tenant: ${dto.tenantKey})`,
    );

    if (!this.transporter) {
      const error = new EmailError(
        EmailErrorType.CONFIGURATION_ERROR,
        'Email transporter not initialized. Email service is not configured.',
      );
      this.logger.error(error.message);
      throw error;
    }

    try {
      const frontendUrl = this.configService.frontendUrl;
      const loginUrl = `${frontendUrl}/login`;

      this.logger.debug(
        `Generating email templates for tenant admin: ${dto.tenantAdminEmail}`,
      );

      // Load email template
      const htmlTemplate = this.getTenantAdminWelcomeEmailTemplate(
        dto.tenantAdminName,
        dto.tenantAdminEmail,
        dto.tenantAdminPassword,
        dto.tenantName,
        dto.tenantKey,
        dto.organizationName ?? null,
        loginUrl,
      );

      const textTemplate = this.getTenantAdminWelcomeEmailTextTemplate(
        dto.tenantAdminName,
        dto.tenantAdminEmail,
        dto.tenantAdminPassword,
        dto.tenantName,
        dto.organizationName ?? null,
        loginUrl,
      );

      this.logger.debug(
        `Sending welcome email to ${dto.tenantAdminEmail} for tenant ${dto.tenantKey}`,
      );

      await this.sendEmail({
        to: dto.tenantAdminEmail,
        subject: `Welcome to ${dto.tenantName} - Your HR Console Account`,
        html: htmlTemplate,
        text: textTemplate,
      });

      this.logger.log(
        `Welcome email sent successfully to ${dto.tenantAdminEmail} for tenant ${dto.tenantKey}`,
      );
    } catch (error) {
      if (error instanceof EmailError) {
        this.logger.error(
          `Failed to send welcome email to ${dto.tenantAdminEmail} (Tenant: ${dto.tenantKey}): ${error.type} - ${error.message}`,
          error.originalError instanceof Error
            ? error.originalError.stack
            : undefined,
        );
      } else {
        this.logger.error(
          `Unexpected error while sending welcome email to ${dto.tenantAdminEmail}:`,
          error instanceof Error ? error.stack : String(error),
        );
      }
      throw error;
    }
  }

  /**
   * Get HTML template for tenant admin welcome email
   */
  private getTenantAdminWelcomeEmailTemplate(
    tenantAdminName: string,
    tenantAdminEmail: string,
    tenantAdminPassword: string,
    tenantName: string,
    tenantKey: string,
    organizationName: string | null,
    loginUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to HR Console</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 30px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Welcome to HR Console!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear ${this.escapeHtml(tenantAdminName)},</p>
              
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Your tenant account has been successfully created. You can now access the HR Console system to manage your organization's HR operations.</p>
              
              <!-- Account Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f9ff; border-left: 4px solid #2563eb; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #1e40af; font-size: 18px; font-weight: 600;">Account Details</h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Tenant Name:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${this.escapeHtml(tenantName)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Tenant Key:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-family: monospace;">${this.escapeHtml(tenantKey)}</td>
                      </tr>
                      ${organizationName ? `
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Default Organization:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${this.escapeHtml(organizationName)}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Login Credentials Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #92400e; font-size: 18px; font-weight: 600;">Login Credentials</h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Email:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; word-break: break-all;">${this.escapeHtml(tenantAdminEmail)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>Password:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">
                          <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; border: 1px solid #d1d5db;">${this.escapeHtml(tenantAdminPassword)}</code>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 15px 0 0; color: #dc2626; font-size: 14px; font-weight: 600;">⚠️ Please change your password after your first login for security purposes.</p>
                  </td>
                </tr>
              </table>
              
              <!-- Login Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${this.escapeHtml(loginUrl)}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">Login to HR Console</a>
                  </td>
                </tr>
              </table>
              
              <!-- Next Steps Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f9ff; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px; color: #0369a1; font-size: 18px; font-weight: 600;">Next Steps</h3>
                    <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 8px;">Click the login button above or visit <a href="${this.escapeHtml(loginUrl)}" style="color: #2563eb; text-decoration: none;">${this.escapeHtml(loginUrl)}</a></li>
                      <li style="margin-bottom: 8px;">Log in using the credentials provided above</li>
                      <li style="margin-bottom: 8px;">Change your password in the account settings</li>
                      <li style="margin-bottom: 8px;">Explore your dashboard and start managing your organization</li>
                      <li style="margin-bottom: 8px;">Create additional organizations if needed</li>
                      <li style="margin-bottom: 8px;">Add employees and set up departments</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                If you have any questions or need assistance, please contact our support team.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Escape HTML to prevent XSS attacks
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Get plain text template for tenant admin welcome email
   */
  private getTenantAdminWelcomeEmailTextTemplate(
    tenantAdminName: string,
    tenantAdminEmail: string,
    tenantAdminPassword: string,
    tenantName: string,
    organizationName: string | null,
    loginUrl: string,
  ): string {
    return `
Welcome to HR Console!

Dear ${tenantAdminName},

Your tenant account has been successfully created. You can now access the HR Console system to manage your organization's HR operations.

Account Details:
- Tenant Name: ${tenantName}
${organizationName ? `- Default Organization: ${organizationName}` : ''}

Login Credentials:
- Email: ${tenantAdminEmail}
- Password: ${tenantAdminPassword}

⚠️ IMPORTANT: Please change your password after your first login for security purposes.

Login URL: ${loginUrl}

Next Steps:
1. Visit the login URL above
2. Log in using the credentials provided
3. Change your password in the account settings
4. Explore your dashboard and start managing your organization
5. Create additional organizations if needed
6. Add employees and set up departments

If you have any questions or need assistance, please contact our support team.

This is an automated email. Please do not reply to this message.
    `.trim();
  }

  /**
   * Send password reset email (for future use)
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<void> {
    // TODO: Implement password reset email template
    this.logger.log(`Password reset email requested for ${email}`);
  }

  /**
   * Send generic notification email
   */
  async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject,
      html: `<p>${message}</p>`,
      text: message,
    });
  }
}

