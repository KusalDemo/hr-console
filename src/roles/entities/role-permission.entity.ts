import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

/**
 * Role Permission Entity - Join table for role-permission relationships
 *
 * This entity represents the many-to-many relationship between roles and permissions
 * with additional attributes:
 * - granted: true = grant permission, false = deny permission (explicit denial)
 *
 * This allows for fine-grained control where a role can explicitly deny a permission
 * even if it might be inherited from a parent role.
 */
@Entity('role_permissions')
@Index('idx_role_permissions_role', ['roleId'])
@Index('idx_role_permissions_perm', ['permissionId'])
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId: number;

  @PrimaryColumn({ name: 'permission_id', type: 'bigint' })
  permissionId: number;

  /**
   * Role this permission belongs to
   */
  @ManyToOne(() => Role, (role) => role.rolePermissions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  /**
   * Permission assigned to the role
   */
  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  /**
   * Whether the permission is granted (true) or denied (false)
   * Default is true (granted)
   * Explicit denial (false) can override inherited permissions
   */
  @Column({ type: 'boolean', nullable: false, default: true })
  granted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  /**
   * Check if permission is granted
   */
  isGranted(): boolean {
    return this.granted;
  }

  /**
   * Check if permission is denied
   */
  isDenied(): boolean {
    return !this.granted;
  }
}
