import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';

/**
 * Permission Entity - Represents granular permissions in the tenant schema
 * 
 * Permissions define specific actions that can be performed on resources.
 * They are organized by resource type (e.g., EMPLOYEE, PROJECT, TIME_OFF) and
 * action (e.g., CREATE, READ, UPDATE, DELETE, APPROVE).
 * 
 * Permissions can be:
 * - System permissions: Predefined by the system, cannot be deleted
 * - Custom permissions: Created by tenant admins for specific needs
 * 
 * Permissions are assigned to roles through the role_permissions join table.
 */
@Entity('permissions')
@Index('idx_permissions_key', ['permissionKey'])
@Index('idx_permissions_resource', ['resourceType'])
@Index('idx_permissions_system', ['isSystem'])
export class Permission {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique permission key (e.g., 'employee.create', 'project.approve')
   * Format: {resource_type}.{action}
   */
  @Column({ name: 'permission_key', type: 'varchar', length: 128, unique: true, nullable: false })
  permissionKey: string;

  /**
   * Human-readable permission name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Permission description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Resource type this permission applies to
   * Examples: EMPLOYEE, PROJECT, TIME_OFF, ATTENDANCE, PAYROLL, etc.
   */
  @Column({ name: 'resource_type', type: 'varchar', length: 128, nullable: true })
  resourceType: string | null;

  /**
   * Action this permission allows
   * Examples: CREATE, READ, UPDATE, DELETE, APPROVE, REJECT, EXPORT, etc.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  action: string | null;

  /**
   * Whether this is a system permission (cannot be deleted)
   */
  @Column({ name: 'is_system', type: 'boolean', nullable: false, default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Roles that have this permission
   * Many-to-many relationship through role_permissions
   */
  @ManyToMany(() => Role, (role) => role.permissions, {
    cascade: false,
    lazy: true,
  })
  roles: Promise<Role[]>;

  /**
   * Role-permission relationships (with granted/denied flag)
   * Direct access to the join table for more control
   */
  @ManyToMany(() => RolePermission, (rolePermission) => rolePermission.permission, {
    cascade: false,
    lazy: true,
  })
  rolePermissions: Promise<RolePermission[]>;

  /**
   * Check if permission is a system permission
   */
  isSystemPermission(): boolean {
    return this.isSystem;
  }

  /**
   * Get full permission identifier (resource.action)
   */
  getFullIdentifier(): string {
    if (this.resourceType && this.action) {
      return `${this.resourceType}.${this.action}`;
    }
    return this.permissionKey;
  }
}

