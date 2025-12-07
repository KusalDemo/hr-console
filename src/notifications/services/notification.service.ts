import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  NotificationTemplateRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
} from '../repositories';
import {
  NotificationTemplate,
  NotificationPreference,
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from '../entities';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { NotificationDeliveryService } from './notification-delivery.service';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  SendNotificationDto,
  NotificationTemplateResponseDto,
  NotificationPreferenceResponseDto,
  NotificationResponseDto,
} from '../dto';

/**
 * Notification Service
 * 
 * Manages notification operations:
 * - Template management (CRUD)
 * - Preference management (CRUD)
 * - Notification creation and sending
 * - Template variable substitution
 * - Preference resolution
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly templateRepository: NotificationTemplateRepository,
    private readonly preferenceRepository: NotificationPreferenceRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== Template Operations ====================

  /**
   * Create notification template
   */
  async createTemplate(
    createDto: CreateNotificationTemplateDto,
    createdBy?: number,
  ): Promise<NotificationTemplateResponseDto> {
    // Check if template key already exists
    const existing = await this.templateRepository.findByKey(createDto.templateKey);
    if (existing) {
      throw new BadRequestException(
        `Template with key "${createDto.templateKey}" already exists`,
      );
    }

    const template = this.templateRepository.create({
      ...createDto,
      createdBy: createdBy || null,
    });

    const saved = await this.templateRepository.save(template);
    this.logger.log(`Created notification template: ${saved.templateKey}`);

    return NotificationTemplateResponseDto.fromEntity(saved);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: number): Promise<NotificationTemplateResponseDto> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }
    return NotificationTemplateResponseDto.fromEntity(template);
  }

  /**
   * Get template by key
   */
  async getTemplateByKey(templateKey: string): Promise<NotificationTemplateResponseDto> {
    const template = await this.templateRepository.findByKey(templateKey);
    if (!template) {
      throw new NotFoundException(`Template not found: ${templateKey}`);
    }
    return NotificationTemplateResponseDto.fromEntity(template);
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: number,
    updateDto: UpdateNotificationTemplateDto,
    updatedBy?: number,
  ): Promise<NotificationTemplateResponseDto> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    if (template.isSystem && updateDto.isActive === false) {
      throw new BadRequestException('Cannot deactivate system template');
    }

    Object.assign(template, {
      ...updateDto,
      updatedBy: updatedBy || null,
    });

    const saved = await this.templateRepository.save(template);
    this.logger.log(`Updated notification template: ${saved.templateKey}`);

    return NotificationTemplateResponseDto.fromEntity(saved);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: number): Promise<void> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system template');
    }

    await this.templateRepository.remove(template);
    this.logger.log(`Deleted notification template: ${template.templateKey}`);
  }

  /**
   * Get all active templates
   */
  async getActiveTemplates(channel?: NotificationChannel): Promise<NotificationTemplateResponseDto[]> {
    const templates = channel
      ? await this.templateRepository.findByChannel(channel)
      : await this.templateRepository.findActive();

    return templates.map((t) => NotificationTemplateResponseDto.fromEntity(t));
  }

  // ==================== Preference Operations ====================

  /**
   * Create notification preference
   */
  async createPreference(
    createDto: CreateNotificationPreferenceDto,
    createdBy?: number,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = this.preferenceRepository.create({
      ...createDto,
      createdBy: createdBy || null,
    });

    const saved = await this.preferenceRepository.save(preference);
    this.logger.log(`Created notification preference for user: ${saved.userId || 'org'}`);

    return NotificationPreferenceResponseDto.fromEntity(saved);
  }

  /**
   * Get preference by ID
   */
  async getPreferenceById(id: number): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.preferenceRepository.findOne({ where: { id } });
    if (!preference) {
      throw new NotFoundException(`Preference not found: ${id}`);
    }
    return NotificationPreferenceResponseDto.fromEntity(preference);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: number): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.preferenceRepository.findByUser(userId);
    return preferences.map((p) => NotificationPreferenceResponseDto.fromEntity(p));
  }

  /**
   * Get organization preferences
   */
  async getOrganizationPreferences(
    organizationId: number,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.preferenceRepository.findByOrganization(organizationId);
    return preferences.map((p) => NotificationPreferenceResponseDto.fromEntity(p));
  }

  /**
   * Update preference
   */
  async updatePreference(
    id: number,
    updateDto: UpdateNotificationPreferenceDto,
    updatedBy?: number,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.preferenceRepository.findOne({ where: { id } });
    if (!preference) {
      throw new NotFoundException(`Preference not found: ${id}`);
    }

    Object.assign(preference, {
      ...updateDto,
      updatedBy: updatedBy || null,
    });

    const saved = await this.preferenceRepository.save(preference);
    return NotificationPreferenceResponseDto.fromEntity(saved);
  }

  /**
   * Delete preference
   */
  async deletePreference(id: number): Promise<void> {
    const preference = await this.preferenceRepository.findOne({ where: { id } });
    if (!preference) {
      throw new NotFoundException(`Preference not found: ${id}`);
    }

    await this.preferenceRepository.remove(preference);
    this.logger.log(`Deleted notification preference: ${id}`);
  }

  // ==================== Notification Operations ====================

  /**
   * Send notification
   */
  async sendNotification(
    sendDto: SendNotificationDto,
    createdBy?: number,
  ): Promise<NotificationResponseDto> {
    // Validate recipient
    const user = await this.employeeRepository.findById(sendDto.userId);
    if (!user) {
      throw new NotFoundException(`User not found: ${sendDto.userId}`);
    }

    // Load template if provided
    let template: NotificationTemplate | null = null;
    if (sendDto.templateKey) {
      template = await this.templateRepository.findByKey(sendDto.templateKey);
      if (!template) {
        throw new NotFoundException(`Template not found: ${sendDto.templateKey}`);
      }
    }

    // Resolve preferences
    const preferences = await this.resolvePreferences(
      sendDto.userId,
      sendDto.organizationId || null,
      sendDto.templateKey || null,
      sendDto.category || null,
    );

    // Determine channels to use
    const channels = sendDto.channels || this.determineChannels(template, preferences);

    // Create notification records for each channel
    const notifications: Notification[] = [];

    for (const channel of channels) {
      // Check if channel is enabled in preferences
      if (!this.isChannelEnabled(channel, preferences)) {
        this.logger.debug(`Channel ${channel} is disabled for user ${sendDto.userId}`);
        continue;
      }

      // Check quiet hours
      if (preferences && preferences.isInQuietHours()) {
        this.logger.debug(`User ${sendDto.userId} is in quiet hours, scheduling notification`);
        // Schedule for later
      }

      // Resolve title and body
      const { title, body } = this.resolveNotificationContent(
        template,
        sendDto,
        channel,
      );

      // Create notification
      const notification = this.notificationRepository.create({
        templateId: template?.id || null,
        templateKey: template?.templateKey || null,
        channel,
        userId: sendDto.userId,
        organizationId: sendDto.organizationId || null,
        title,
        body,
        category: sendDto.category || template?.category || null,
        priority: sendDto.priority || template?.defaultPriority || NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
        scheduledAt: sendDto.scheduledAt || null,
        recipientEmail: channel === NotificationChannel.EMAIL ? user.email : null,
        recipientPhone: channel === NotificationChannel.SMS ? user.phone || user.mobile : null,
        webhookUrl: channel === NotificationChannel.WEBHOOK ? sendDto.webhookUrl || null : null,
        actionUrl: sendDto.actionUrl || null,
        actionLabel: sendDto.actionLabel || null,
        relatedEntityType: sendDto.relatedEntityType || null,
        relatedEntityId: sendDto.relatedEntityId || null,
        templateVariables: sendDto.templateVariables || null,
        createdBy: createdBy || null,
      });

      const saved = await this.notificationRepository.save(notification);
      notifications.push(saved);

      // Queue for delivery
      await this.deliveryService.queueNotification(saved);
    }

    // Return the first notification
    if (notifications.length === 0) {
      throw new BadRequestException('No notifications were created');
    }
    return NotificationResponseDto.fromEntity(notifications[0]);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: number,
    options?: {
      status?: NotificationStatus;
      channel?: string;
      category?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.findByUser(userId, options);
    return notifications.map((n) => NotificationResponseDto.fromEntity(n));
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.countUnreadByUser(userId);
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: number, notificationIds?: number[]): Promise<void> {
    await this.notificationRepository.markAsRead(userId, notificationIds);
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: number): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification not found: ${id}`);
    }
    return NotificationResponseDto.fromEntity(notification);
  }

  // ==================== Helper Methods ====================

  /**
   * Resolve notification preferences (user > template > category > global)
   */
  private async resolvePreferences(
    userId: number,
    organizationId: number | null,
    templateKey: string | null,
    category: string | null,
  ): Promise<NotificationPreference | null> {
    // Try user-specific template preference
    if (templateKey) {
      const userTemplatePref = await this.preferenceRepository.findByUserAndTemplate(
        userId,
        templateKey,
      );
      if (userTemplatePref) {
        return userTemplatePref;
      }
    }

    // Try user-specific category preference
    if (category) {
      const userCategoryPref = await this.preferenceRepository.findByUserAndCategory(
        userId,
        category,
      );
      if (userCategoryPref) {
        return userCategoryPref;
      }
    }

    // Try user global preference
    const userGlobalPref = await this.preferenceRepository.findGlobalByUser(userId);
    if (userGlobalPref) {
      return userGlobalPref;
    }

    // Try organization preferences
    if (organizationId) {
      if (templateKey) {
        const orgTemplatePref = await this.preferenceRepository.findByOrganizationAndTemplate(
          organizationId,
          templateKey,
        );
        if (orgTemplatePref) {
          return orgTemplatePref;
        }
      }

      if (category) {
        const orgCategoryPref = await this.preferenceRepository.findByOrganizationAndCategory(
          organizationId,
          category,
        );
        if (orgCategoryPref) {
          return orgCategoryPref;
        }
      }

      const orgGlobalPref = await this.preferenceRepository.findGlobalByOrganization(
        organizationId,
      );
      if (orgGlobalPref) {
        return orgGlobalPref;
      }
    }

    return null;
  }

  /**
   * Determine channels to use
   */
  private determineChannels(
    template: NotificationTemplate | null,
    preferences: NotificationPreference | null,
  ): NotificationChannel[] {
    if (template) {
      return [template.channel];
    }

    // Default to all enabled channels from preferences
    const channels: NotificationChannel[] = [];
    if (!preferences || preferences.emailEnabled) {
      channels.push(NotificationChannel.EMAIL);
    }
    if (!preferences || preferences.inAppEnabled) {
      channels.push(NotificationChannel.IN_APP);
    }
    if (preferences && preferences.pushEnabled) {
      channels.push(NotificationChannel.PUSH);
    }
    if (preferences && preferences.smsEnabled) {
      channels.push(NotificationChannel.SMS);
    }

    return channels.length > 0 ? channels : [NotificationChannel.IN_APP];
  }

  /**
   * Check if channel is enabled
   */
  private isChannelEnabled(
    channel: NotificationChannel,
    preferences: NotificationPreference | null,
  ): boolean {
    if (!preferences) {
      return true; // Default enabled
    }

    switch (channel) {
      case NotificationChannel.EMAIL:
        return preferences.emailEnabled;
      case NotificationChannel.SMS:
        return preferences.smsEnabled;
      case NotificationChannel.PUSH:
        return preferences.pushEnabled;
      case NotificationChannel.IN_APP:
        return preferences.inAppEnabled;
      case NotificationChannel.WEBHOOK:
        return preferences.webhookEnabled;
      default:
        return true;
    }
  }

  /**
   * Resolve notification content (title and body)
   */
  private resolveNotificationContent(
    template: NotificationTemplate | null,
    sendDto: SendNotificationDto,
    channel: NotificationChannel,
  ): { title: string; body: string } {
    let title = sendDto.title || '';
    let body = sendDto.body || '';

    if (template) {
      // Use template content based on channel
      switch (channel) {
        case NotificationChannel.EMAIL:
          title = template.emailSubject || title;
          body = template.emailBody || body;
          break;
        case NotificationChannel.SMS:
          body = template.smsBody || body;
          break;
        case NotificationChannel.PUSH:
          title = template.pushTitle || title;
          body = template.pushBody || body;
          break;
        case NotificationChannel.IN_APP:
          title = template.inAppTitle || title;
          body = template.inAppBody || body;
          break;
        default:
          break;
      }
    }

    // Substitute template variables
    if (sendDto.templateVariables) {
      title = this.substituteVariables(title, sendDto.templateVariables);
      body = this.substituteVariables(body, sendDto.templateVariables);
    }

    return { title, body };
  }

  /**
   * Substitute template variables (e.g., {{userName}})
   */
  private substituteVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }
}
