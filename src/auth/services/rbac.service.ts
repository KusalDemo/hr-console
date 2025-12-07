import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../users/repositories/user.repository';
import { RoleRepository } from '../../roles/repositories/role.repository';
import { PermissionRepository } from '../../roles/repositories/permission.repository';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../roles/entities/permission.entity';
import { RolePermission } from '../../roles/entities/role-permission.entity';

/**
 * RBAC Service
 *
 * Provides Role-Based Access Control functionality:
 * - Permission checking (with role hierarchy support)
 * - Role assignment to users
 * - Permission assignment to roles
 * - Dynamic permission evaluation (including inherited permissions)
 * - Permission inheritance from parent roles
 * - Explicit permission denial support
 *
 * This service handles all RBAC operations and provides a centralized
 * way to check permissions, assign roles, and manage permissions.
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  /**
   * Check if user has a specific permission
   *
   * This method:
   * 1. Checks if user is active
   * 2. Gets all user roles
   * 3. Checks if any role has the permission (including inherited permissions)
   * 4. Respects explicit permission denial
   *
   * @param userId - User ID
   * @param permissionKey - Permission key (e.g., 'employee.create')
   * @returns true if user has permission, false otherwise
   */
  async hasPermission(userId: number, permissionKey: string): Promise<boolean> {
    this.logger.debug(`Checking permission: userId=${userId}, permissionKey=${permissionKey}`);

    // Get user with roles
    const user = await this.userRepository.findById(userId);
    if (!user || !user.active) {
      this.logger.debug(`User not found or inactive: userId=${userId}`);
      return false;
    }

    // Get permission
    const permission = await this.permissionRepository.findByKey(permissionKey);
    if (!permission) {
      this.logger.debug(`Permission not found: permissionKey=${permissionKey}`);
      return false;
    }

    // Check if any role has the permission
    const roles = user.roles || [];
    for (const role of roles) {
      const roleWithPermissions = await this.roleRepository.findById(role.id, true);
      if (!roleWithPermissions) {
        continue;
      }

      if (await this.roleHasPermission(roleWithPermissions, permission)) {
        this.logger.debug(
          `User has permission via role: userId=${userId}, role=${role.name}, permissionKey=${permissionKey}`,
        );
        return true;
      }
    }

    this.logger.debug(
      `User does not have permission: userId=${userId}, permissionKey=${permissionKey}`,
    );
    return false;
  }

  /**
   * Check if user has any of the specified permissions
   *
   * @param userId - User ID
   * @param permissionKeys - Array of permission keys
   * @returns true if user has at least one permission, false otherwise
   */
  async hasAnyPermission(userId: number, permissionKeys: string[]): Promise<boolean> {
    for (const permissionKey of permissionKeys) {
      if (await this.hasPermission(userId, permissionKey)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   *
   * @param userId - User ID
   * @param permissionKeys - Array of permission keys
   * @returns true if user has all permissions, false otherwise
   */
  async hasAllPermissions(userId: number, permissionKeys: string[]): Promise<boolean> {
    for (const permissionKey of permissionKeys) {
      if (!(await this.hasPermission(userId, permissionKey))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if role has permission (including inherited permissions)
   *
   * This method:
   * 1. Checks direct role permissions
   * 2. Checks inherited permissions from parent roles
   * 3. Respects explicit permission denial (granted = false)
   *
   * @param role - Role entity with permissions loaded
   * @param permission - Permission entity
   * @returns true if role has permission, false otherwise
   */
  async roleHasPermission(role: Role, permission: Permission): Promise<boolean> {
    // Check direct permissions first (most specific)
    const rolePermissions = await role.rolePermissions;
    for (const rolePermission of rolePermissions) {
      if (rolePermission.permissionId === permission.id) {
        // Explicit denial takes precedence
        return rolePermission.granted;
      }
    }

    // Check inherited permissions from parent roles
    if (role.parentRoleId) {
      const parentRole = await this.roleRepository.findById(role.parentRoleId, true);
      if (parentRole) {
        // Check if parent explicitly denies this permission
        const parentRolePermissions = await parentRole.rolePermissions;
        for (const parentRolePermission of parentRolePermissions) {
          if (
            parentRolePermission.permissionId === permission.id &&
            !parentRolePermission.granted
          ) {
            // Parent explicitly denies, so child cannot have it
            return false;
          }
        }

        // Recursively check parent role
        return this.roleHasPermission(parentRole, permission);
      }
    }

    return false;
  }

  /**
   * Get all permissions for a user
   *
   * Returns all permissions the user has through their roles,
   * including inherited permissions from parent roles.
   *
   * @param userId - User ID
   * @returns Array of permission keys
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    this.logger.debug(`Getting permissions for user: userId=${userId}`);

    const user = await this.userRepository.findById(userId);
    if (!user || !user.active) {
      return [];
    }

    const permissionSet = new Set<string>();
    const roles = user.roles || [];

    for (const role of roles) {
      const roleWithPermissions = await this.roleRepository.findById(role.id, true);
      if (!roleWithPermissions) {
        continue;
      }

      const rolePermissions = await this.getRolePermissions(roleWithPermissions);
      rolePermissions.forEach((perm) => permissionSet.add(perm));
    }

    return Array.from(permissionSet);
  }

  /**
   * Get all permissions for a role (including inherited permissions)
   *
   * @param role - Role entity with permissions loaded
   * @returns Array of permission keys
   */
  async getRolePermissions(role: Role): Promise<string[]> {
    const permissionSet = new Set<string>();
    const deniedPermissions = new Set<number>();

    // Get direct permissions
    const rolePermissions = await role.rolePermissions;
    for (const rolePermission of rolePermissions) {
      const permission = await this.permissionRepository.findById(rolePermission.permissionId);
      if (permission) {
        if (rolePermission.granted) {
          permissionSet.add(permission.permissionKey);
        } else {
          // Track denied permissions
          deniedPermissions.add(permission.id);
        }
      }
    }

    // Get inherited permissions from parent roles
    if (role.parentRoleId) {
      const parentRole = await this.roleRepository.findById(role.parentRoleId, true);
      if (parentRole) {
        const parentPermissions = await this.getRolePermissions(parentRole);
        for (const parentPermissionKey of parentPermissions) {
          const parentPermission = await this.permissionRepository.findByKey(parentPermissionKey);
          if (parentPermission && !deniedPermissions.has(parentPermission.id)) {
            // Only add if not explicitly denied
            permissionSet.add(parentPermissionKey);
          }
        }
      }
    }

    return Array.from(permissionSet);
  }

  /**
   * Assign role to user
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns Updated user entity
   */
  async assignRoleToUser(userId: number, roleId: number): Promise<User> {
    this.logger.log(`Assigning role to user: userId=${userId}, roleId=${roleId}`);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Check if user already has the role
    const hasRole = user.roles?.some((r) => r.id === roleId);
    if (hasRole) {
      this.logger.debug(`User already has role: userId=${userId}, roleId=${roleId}`);
      return user;
    }

    // Add role to user
    if (!user.roles) {
      user.roles = [];
    }
    user.roles.push(role);

    await this.userRepository.save(user);

    this.logger.log(`Role assigned to user: userId=${userId}, roleId=${roleId}`);
    return user;
  }

  /**
   * Assign role to user by role name
   *
   * @param userId - User ID
   * @param roleName - Role name
   * @returns Updated user entity
   */
  async assignRoleToUserByName(userId: number, roleName: string): Promise<User> {
    const role = await this.roleRepository.findByName(roleName);
    if (!role) {
      throw new NotFoundException(`Role with name ${roleName} not found`);
    }

    return this.assignRoleToUser(userId, role.id);
  }

  /**
   * Remove role from user
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns Updated user entity
   */
  async removeRoleFromUser(userId: number, roleId: number): Promise<User> {
    this.logger.log(`Removing role from user: userId=${userId}, roleId=${roleId}`);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if user has the role
    const hasRole = user.roles?.some((r) => r.id === roleId);
    if (!hasRole) {
      this.logger.debug(`User does not have role: userId=${userId}, roleId=${roleId}`);
      return user;
    }

    // Remove role from user
    user.roles = user.roles.filter((r) => r.id !== roleId);

    await this.userRepository.save(user);

    this.logger.log(`Role removed from user: userId=${userId}, roleId=${roleId}`);
    return user;
  }

  /**
   * Remove role from user by role name
   *
   * @param userId - User ID
   * @param roleName - Role name
   * @returns Updated user entity
   */
  async removeRoleFromUserByName(userId: number, roleName: string): Promise<User> {
    const role = await this.roleRepository.findByName(roleName);
    if (!role) {
      throw new NotFoundException(`Role with name ${roleName} not found`);
    }

    return this.removeRoleFromUser(userId, role.id);
  }

  /**
   * Assign multiple roles to user
   *
   * @param userId - User ID
   * @param roleIds - Array of role IDs
   * @returns Updated user entity
   */
  async assignRolesToUser(userId: number, roleIds: number[]): Promise<User> {
    this.logger.log(
      `Assigning multiple roles to user: userId=${userId}, roleIds=${roleIds.join(',')}`,
    );

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get all roles
    const roles = await Promise.all(roleIds.map((roleId) => this.roleRepository.findById(roleId)));

    const notFoundRoles = roles
      .map((role, index) => (!role ? roleIds[index] : null))
      .filter((id) => id !== null);

    if (notFoundRoles.length > 0) {
      throw new NotFoundException(`Roles not found: ${notFoundRoles.join(', ')}`);
    }

    // Get existing role IDs
    const existingRoleIds = new Set((user.roles || []).map((r) => r.id));

    // Add new roles
    if (!user.roles) {
      user.roles = [];
    }

    for (const role of roles) {
      if (role && !existingRoleIds.has(role.id)) {
        user.roles.push(role);
      }
    }

    await this.userRepository.save(user);

    this.logger.log(`Roles assigned to user: userId=${userId}`);
    return user;
  }

  /**
   * Replace all user roles
   *
   * @param userId - User ID
   * @param roleIds - Array of role IDs
   * @returns Updated user entity
   */
  async replaceUserRoles(userId: number, roleIds: number[]): Promise<User> {
    this.logger.log(`Replacing user roles: userId=${userId}, roleIds=${roleIds.join(',')}`);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get all roles
    const roles = await Promise.all(roleIds.map((roleId) => this.roleRepository.findById(roleId)));

    const notFoundRoles = roles
      .map((role, index) => (!role ? roleIds[index] : null))
      .filter((id) => id !== null);

    if (notFoundRoles.length > 0) {
      throw new NotFoundException(`Roles not found: ${notFoundRoles.join(', ')}`);
    }

    // Replace roles
    user.roles = roles.filter((role) => role !== null) as Role[];

    await this.userRepository.save(user);

    this.logger.log(`User roles replaced: userId=${userId}`);
    return user;
  }

  /**
   * Assign permission to role
   *
   * @param roleId - Role ID
   * @param permissionId - Permission ID
   * @param granted - Whether to grant (true) or deny (false) the permission
   * @returns Updated role entity
   */
  async assignPermissionToRole(
    roleId: number,
    permissionId: number,
    granted: boolean = true,
  ): Promise<Role> {
    this.logger.log(
      `Assigning permission to role: roleId=${roleId}, permissionId=${permissionId}, granted=${granted}`,
    );

    const role = await this.roleRepository.findById(roleId, true);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const permission = await this.permissionRepository.findById(permissionId);
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    // Check if permission is already assigned
    const rolePermissions = await role.rolePermissions;
    const existingRolePermission = rolePermissions.find((rp) => rp.permissionId === permissionId);

    if (existingRolePermission) {
      // Update existing assignment
      existingRolePermission.granted = granted;
      await this.dataSource.getRepository(RolePermission).save(existingRolePermission);
    } else {
      // Create new assignment
      const rolePermission = this.dataSource.getRepository(RolePermission).create({
        roleId,
        permissionId,
        granted,
      });
      await this.dataSource.getRepository(RolePermission).save(rolePermission);
    }

    this.logger.log(`Permission assigned to role: roleId=${roleId}, permissionId=${permissionId}`);
    return this.roleRepository.findById(roleId, true) as Promise<Role>;
  }

  /**
   * Assign permission to role by keys
   *
   * @param roleId - Role ID
   * @param permissionKey - Permission key
   * @param granted - Whether to grant (true) or deny (false) the permission
   * @returns Updated role entity
   */
  async assignPermissionToRoleByKey(
    roleId: number,
    permissionKey: string,
    granted: boolean = true,
  ): Promise<Role> {
    const permission = await this.permissionRepository.findByKey(permissionKey);
    if (!permission) {
      throw new NotFoundException(`Permission with key ${permissionKey} not found`);
    }

    return this.assignPermissionToRole(roleId, permission.id, granted);
  }

  /**
   * Remove permission from role
   *
   * @param roleId - Role ID
   * @param permissionId - Permission ID
   * @returns Updated role entity
   */
  async removePermissionFromRole(roleId: number, permissionId: number): Promise<Role> {
    this.logger.log(
      `Removing permission from role: roleId=${roleId}, permissionId=${permissionId}`,
    );

    const role = await this.roleRepository.findById(roleId, true);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Remove permission assignment
    await this.dataSource.getRepository(RolePermission).delete({
      roleId,
      permissionId,
    });

    this.logger.log(`Permission removed from role: roleId=${roleId}, permissionId=${permissionId}`);
    return this.roleRepository.findById(roleId, true) as Promise<Role>;
  }

  /**
   * Assign multiple permissions to role
   *
   * @param roleId - Role ID
   * @param permissionIds - Array of permission IDs
   * @param granted - Whether to grant (true) or deny (false) the permissions
   * @returns Updated role entity
   */
  async assignPermissionsToRole(
    roleId: number,
    permissionIds: number[],
    granted: boolean = true,
  ): Promise<Role> {
    this.logger.log(
      `Assigning multiple permissions to role: roleId=${roleId}, permissionIds=${permissionIds.join(',')}, granted=${granted}`,
    );

    const role = await this.roleRepository.findById(roleId, true);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Get all permissions
    const permissions = await Promise.all(
      permissionIds.map((permissionId) => this.permissionRepository.findById(permissionId)),
    );

    const notFoundPermissions = permissions
      .map((permission, index) => (!permission ? permissionIds[index] : null))
      .filter((id) => id !== null);

    if (notFoundPermissions.length > 0) {
      throw new NotFoundException(`Permissions not found: ${notFoundPermissions.join(', ')}`);
    }

    const rolePermissionRepo = this.dataSource.getRepository(RolePermission);
    const rolePermissions = await role.rolePermissions;

    // Create or update permission assignments
    for (const permission of permissions) {
      if (!permission) continue;

      const existingRolePermission = rolePermissions.find(
        (rp) => rp.permissionId === permission.id,
      );

      if (existingRolePermission) {
        existingRolePermission.granted = granted;
        await rolePermissionRepo.save(existingRolePermission);
      } else {
        const rolePermission = rolePermissionRepo.create({
          roleId,
          permissionId: permission.id,
          granted,
        });
        await rolePermissionRepo.save(rolePermission);
      }
    }

    this.logger.log(`Permissions assigned to role: roleId=${roleId}`);
    return this.roleRepository.findById(roleId, true) as Promise<Role>;
  }

  /**
   * Get user roles
   *
   * @param userId - User ID
   * @returns Array of role entities
   */
  async getUserRoles(userId: number): Promise<Role[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user.roles || [];
  }

  /**
   * Check if user has a specific role
   *
   * @param userId - User ID
   * @param roleName - Role name
   * @returns true if user has the role, false otherwise
   */
  async userHasRole(userId: number, roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some((role) => role.name === roleName);
  }

  /**
   * Check if user has any of the specified roles
   *
   * @param userId - User ID
   * @param roleNames - Array of role names
   * @returns true if user has at least one role, false otherwise
   */
  async userHasAnyRole(userId: number, roleNames: string[]): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    const userRoleNames = roles.map((role) => role.name);
    return roleNames.some((roleName) => userRoleNames.includes(roleName));
  }
}
