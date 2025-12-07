import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './services';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  SendNotificationDto,
  NotificationTemplateResponseDto,
  NotificationPreferenceResponseDto,
  NotificationResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationChannel, NotificationStatus } from './entities';

/**
 * Notifications Controller
 *
 * REST API endpoints for notification system:
 * - Template management (CRUD)
 * - Preference management (CRUD)
 * - Send notifications
 * - Get user notifications
 * - Mark notifications as read
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  // ========== Template Endpoints ==========

  /**
   * Create notification template
   * POST /notifications/templates
   */
  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createTemplate(
    @Body() createDto: CreateNotificationTemplateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationTemplateResponseDto> {
    return this.notificationService.createTemplate(createDto, user.userId);
  }

  /**
   * Get template by ID
   * GET /notifications/templates/:id
   */
  @Get('templates/:id')
  async getTemplate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationTemplateResponseDto> {
    return this.notificationService.getTemplateById(id);
  }

  /**
   * Get template by key
   * GET /notifications/templates/key/:key
   */
  @Get('templates/key/:key')
  async getTemplateByKey(@Param('key') key: string): Promise<NotificationTemplateResponseDto> {
    return this.notificationService.getTemplateByKey(key);
  }

  /**
   * Update template
   * PUT /notifications/templates/:id
   */
  @Put('templates/:id')
  @Roles('ADMIN', 'HR')
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateNotificationTemplateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationTemplateResponseDto> {
    return this.notificationService.updateTemplate(id, updateDto, user.userId);
  }

  /**
   * Delete template
   * DELETE /notifications/templates/:id
   */
  @Delete('templates/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.notificationService.deleteTemplate(id);
  }

  /**
   * Get active templates
   * GET /notifications/templates
   */
  @Get('templates')
  async getTemplates(
    @Query('channel') channel?: NotificationChannel,
  ): Promise<NotificationTemplateResponseDto[]> {
    return this.notificationService.getActiveTemplates(channel);
  }

  // ========== Preference Endpoints ==========

  /**
   * Create notification preference
   * POST /notifications/preferences
   */
  @Post('preferences')
  @HttpCode(HttpStatus.CREATED)
  async createPreference(
    @Body() createDto: CreateNotificationPreferenceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationService.createPreference(createDto, user.userId);
  }

  /**
   * Get preference by ID
   * GET /notifications/preferences/:id
   */
  @Get('preferences/:id')
  async getPreference(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationService.getPreferenceById(id);
  }

  /**
   * Get user preferences
   * GET /notifications/preferences/user/:userId
   */
  @Get('preferences/user/:userId')
  async getUserPreferences(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.notificationService.getUserPreferences(userId);
  }

  /**
   * Get my preferences
   * GET /notifications/preferences/me
   */
  @Get('preferences/me')
  async getMyPreferences(
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.notificationService.getUserPreferences(user.userId);
  }

  /**
   * Get organization preferences
   * GET /notifications/preferences/organization/:organizationId
   */
  @Get('preferences/organization/:organizationId')
  @Roles('ADMIN', 'HR')
  async getOrganizationPreferences(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.notificationService.getOrganizationPreferences(organizationId);
  }

  /**
   * Update preference
   * PUT /notifications/preferences/:id
   */
  @Put('preferences/:id')
  async updatePreference(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateNotificationPreferenceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationService.updatePreference(id, updateDto, user.userId);
  }

  /**
   * Delete preference
   * DELETE /notifications/preferences/:id
   */
  @Delete('preferences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePreference(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.notificationService.deletePreference(id);
  }

  // ========== Notification Endpoints ==========

  /**
   * Send notification
   * POST /notifications/send
   */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'SYSTEM')
  async sendNotification(
    @Body() sendDto: SendNotificationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.sendNotification(sendDto, user.userId);
  }

  /**
   * Get notification by ID
   * GET /notifications/:id
   */
  @Get(':id')
  async getNotification(@Param('id', ParseIntPipe) id: number): Promise<NotificationResponseDto> {
    return this.notificationService.getNotificationById(id);
  }

  /**
   * Get user notifications
   * GET /notifications/user/:userId
   */
  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('status') status?: NotificationStatus,
    @Query('channel') channel?: string,
    @Query('category') category?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getUserNotifications(userId, {
      status,
      channel,
      category,
      limit,
      offset,
    });
  }

  /**
   * Get my notifications
   * GET /notifications/me
   */
  @Get('me')
  async getMyNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: NotificationStatus,
    @Query('channel') channel?: string,
    @Query('category') category?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getUserNotifications(user.userId, {
      status,
      channel,
      category,
      limit,
      offset,
    });
  }

  /**
   * Get unread count
   * GET /notifications/me/unread-count
   */
  @Get('me/unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(user.userId);
    return { count };
  }

  /**
   * Mark notifications as read
   * POST /notifications/me/mark-read
   */
  @Post('me/mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Body('notificationIds') notificationIds?: number[],
  ): Promise<void> {
    return this.notificationService.markAsRead(user.userId, notificationIds);
  }
}
