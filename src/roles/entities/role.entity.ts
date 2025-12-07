import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';

/**
 * Role Entity - Represents roles in the tenant schema with RBAC support
 *
 * Roles define sets of permissions that can be assigned to users.
 * Roles support:
 * - Hierarchical relationships (parent-child roles)
 * - Permission assignments (many-to-many through role_permissions)
 * - System roles (predefined, cannot be deleted)
 * - Custom roles (created by tenant admins)
 *
 * Role hierarchy allows child roles to inherit permissions from parent roles,
 * with the ability to override or deny specific permissions.
 */
@Entity('roles')
@Index('idx_roles_name', ['name'])
@Index('idx_roles_parent', ['parentRole'])
@Index('idx_roles_system', ['isSystemRole'])
export class Role {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique role name (e.g., 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
   */
  @Column({ type: 'varchar', length: 64, unique: true, nullable: false })
  name: string;

  /**
   * Role description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Parent role for hierarchy support
   * Child roles inherit permissions from parent roles
   */
  @ManyToOne(() => Role, (role) => role.childRoles, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_role_id' })
  parentRole: Role | null;

  @Column({ name: 'parent_role_id', type: 'bigint', nullable: true })
  parentRoleId: number | null;

  /**
   * Child roles (roles that have this role as parent)
   */
  @OneToMany(() => Role, (role) => role.parentRole, {
    cascade: false,
    lazy: true,
  })
  childRoles: Promise<Role[]>;

  /**
   * Whether this is a system role (cannot be deleted)
   */
  @Column({ name: 'is_system_role', type: 'boolean', default: false, nullable: false })
  isSystemRole: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Permissions assigned to this role
   * Many-to-many relationship through role_permissions
   */
  @ManyToMany(() => Permission, (permission) => permission.roles, {
    cascade: false,
    lazy: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Promise<Permission[]>;

  /**
   * Role-permission relationships (with granted/denied flag)
   * Direct access to the join table for more control
   */
  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role, {
    cascade: false,
    lazy: true,
  })
  rolePermissions: Promise<RolePermission[]>;

  /**
   * Check if role is a system role
   */
  isSystem(): boolean {
    return this.isSystemRole;
  }

  /**
   * Check if role has a parent role
   */
  hasParent(): boolean {
    return this.parentRoleId !== null;
  }

  /**
   * Check if role has child roles
   */
  async hasChildren(): Promise<boolean> {
    const children = await this.childRoles;
    return children.length > 0;
  }

  /**
   * Get all ancestor roles (parent, grandparent, etc.)
   * This is useful for permission inheritance
   */
  async getAncestors(): Promise<Role[]> {
    const ancestors: Role[] = [];
    let current: Role | null = this.parentRole;

    while (current) {
      ancestors.push(current);
      current = current.parentRole;
    }

    return ancestors;
  }

  /**
   * Get all descendant roles (children, grandchildren, etc.)
   */
  async getDescendants(): Promise<Role[]> {
    const descendants: Role[] = [];
    const children = await this.childRoles;

    for (const child of children) {
      descendants.push(child);
      const childDescendants = await child.getDescendants();
      descendants.push(...childDescendants);
    }

    return descendants;
  }
}
