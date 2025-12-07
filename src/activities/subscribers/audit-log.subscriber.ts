import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { AuditLogService } from '../services/audit-log.service';
import {
  AuditLog,
  AuditLevel,
  ActivityCategory,
  ActorType,
} from '../entities/audit-log.entity';
import { Injectable } from '@nestjs/common';

/**
 * Audit Log Subscriber
 * 
 * Automatically logs entity lifecycle events:
 * - Entity creation
 * - Entity updates (with before/after values)
 * - Entity deletion
 * 
 * This subscriber uses TypeORM's event system to automatically
 * track changes to entities for audit purposes.
 */
@EventSubscriber()
@Injectable()
export class AuditLogSubscriber implements EntitySubscriberInterface {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Get the entity class this subscriber listens to
   * Returns null to listen to all entities
   */
  listenTo(): Function | string {
    // Listen to all entities by returning a pattern
    // In practice, you might want to filter specific entities
    return /.*/;
  }

  /**
   * Handle entity insertion (CREATE)
   */
  async afterInsert(event: InsertEvent<any>): Promise<void> {
    // Skip audit log entity itself to avoid recursion
    if (event.entity.constructor.name === 'AuditLog') {
      return;
    }

    try {
      const entity = event.entity;
      const entityName = event.metadata.name;

      // Extract actor information from entity if available
      const actorId = entity.createdBy || null;
      const actorName = entity.createdBy ? `User ${actorId}` : 'System';

      await this.auditLogService.createAuditLog({
        activityType: 'ENTITY_CREATED',
        activityCategory: ActivityCategory.ENTITY,
        actorType: actorId ? ActorType.USER : ActorType.SYSTEM,
        actorId,
        actorName,
        targetType: entityName,
        targetId: entity.id || null,
        targetName: this.getEntityDisplayName(entity),
        organizationId: entity.organizationId || null,
        description: `${entityName} created`,
        auditLevel: AuditLevel.INFO,
        beforeValues: null,
        afterValues: this.sanitizeEntity(entity),
        metadata: {
          entityType: entityName,
          operation: 'CREATE',
        },
      });
    } catch (error) {
      // Don't throw errors in subscribers to avoid breaking the main operation
      console.error('Failed to create audit log for INSERT:', error);
    }
  }

  /**
   * Handle entity update (UPDATE)
   */
  async afterUpdate(event: UpdateEvent<any>): Promise<void> {
    // Skip audit log entity itself
    if (event.entity?.constructor?.name === 'AuditLog') {
      return;
    }

    try {
      const entity = event.entity;
      const databaseEntity = event.databaseEntity;
      const entityName = event.metadata.name;

      if (!entity || !databaseEntity) {
        return;
      }

      // Extract actor information
      const actorId = entity.updatedBy || null;
      const actorName = actorId ? `User ${actorId}` : 'System';

      // Get before and after values
      const beforeValues = this.sanitizeEntity(databaseEntity);
      const afterValues = this.sanitizeEntity(entity);

      await this.auditLogService.createAuditLog({
        activityType: 'ENTITY_UPDATED',
        activityCategory: ActivityCategory.ENTITY,
        actorType: actorId ? ActorType.USER : ActorType.SYSTEM,
        actorId,
        actorName,
        targetType: entityName,
        targetId: entity.id || null,
        targetName: this.getEntityDisplayName(entity),
        organizationId: entity.organizationId || null,
        description: `${entityName} updated`,
        auditLevel: AuditLevel.INFO,
        beforeValues,
        afterValues,
        metadata: {
          entityType: entityName,
          operation: 'UPDATE',
          updatedFields: event.updatedColumns?.map((col) => col.propertyName) || [],
        },
      });
    } catch (error) {
      console.error('Failed to create audit log for UPDATE:', error);
    }
  }

  /**
   * Handle entity removal (DELETE)
   */
  async beforeRemove(event: RemoveEvent<any>): Promise<void> {
    // Skip audit log entity itself
    if (event.entity?.constructor?.name === 'AuditLog') {
      return;
    }

    try {
      const entity = event.entity;
      const entityName = event.metadata.name;

      // Extract actor information if available
      const actorId = entity.deletedBy || null;
      const actorName = actorId ? `User ${actorId}` : 'System';

      await this.auditLogService.createAuditLog({
        activityType: 'ENTITY_DELETED',
        activityCategory: ActivityCategory.ENTITY,
        actorType: actorId ? ActorType.USER : ActorType.SYSTEM,
        actorId,
        actorName,
        targetType: entityName,
        targetId: entity.id || null,
        targetName: this.getEntityDisplayName(entity),
        organizationId: entity.organizationId || null,
        description: `${entityName} deleted`,
        auditLevel: AuditLevel.WARN,
        beforeValues: this.sanitizeEntity(entity),
        afterValues: null,
        metadata: {
          entityType: entityName,
          operation: 'DELETE',
        },
      });
    } catch (error) {
      console.error('Failed to create audit log for DELETE:', error);
    }
  }

  /**
   * Get display name for entity
   */
  private getEntityDisplayName(entity: any): string | null {
    if (!entity) {
      return null;
    }

    // Try common name fields
    if (entity.name) {
      return entity.name;
    }
    if (entity.title) {
      return entity.title;
    }
    if (entity.firstName && entity.lastName) {
      return `${entity.firstName} ${entity.lastName}`;
    }
    if (entity.email) {
      return entity.email;
    }
    if (entity.id) {
      return `ID: ${entity.id}`;
    }

    return null;
  }

  /**
   * Sanitize entity for audit logging
   * Removes sensitive fields and circular references
   */
  private sanitizeEntity(entity: any): Record<string, any> | null {
    if (!entity) {
      return null;
    }

    const sanitized: Record<string, any> = {};
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];

    Object.keys(entity).forEach((key) => {
      // Skip sensitive fields
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
        return;
      }

      // Skip functions and complex objects
      const value = entity[key];
      if (typeof value === 'function') {
        return;
      }

      if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object' && value !== null) {
        // Handle simple objects, skip complex nested structures
        try {
          JSON.stringify(value);
          sanitized[key] = value;
        } catch {
          sanitized[key] = '[COMPLEX OBJECT]';
        }
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }
}
