import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { EmailService } from './email.service';

/**
 * Email Module
 * 
 * Provides email sending functionality using Nodemailer.
 * Supports:
 * - SMTP email sending
 * - Email templates
 * - Tenant admin welcome emails
 * - Notification emails
 */
@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

