import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { NotificationTemplate, NotificationChannel } from '../entities';

@Injectable()
export class NotificationTemplateRepository extends Repository<NotificationTemplate> {
  constructor(private dataSource: DataSource) {
    super(NotificationTemplate, dataSource.createEntityManager());
  }

  /**
   * Find template by key
   */
  async findByKey(templateKey: string): Promise<NotificationTemplate | null> {
    return this.findOne({
      where: { templateKey, isActive: true },
    });
  }

  /**
   * Find templates by channel
   */
  async findByChannel(channel: NotificationChannel): Promise<NotificationTemplate[]> {
    return this.find({
      where: { channel, isActive: true },
      order: { templateName: 'ASC' },
    });
  }

  /**
   * Find templates by category
   */
  async findByCategory(category: string): Promise<NotificationTemplate[]> {
    return this.find({
      where: { category, isActive: true },
      order: { templateName: 'ASC' },
    });
  }

  /**
   * Find active templates
   */
  async findActive(): Promise<NotificationTemplate[]> {
    return this.find({
      where: { isActive: true },
      order: { templateName: 'ASC' },
    });
  }
}
