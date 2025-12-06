import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Roles and Permissions Migration
 * 
 * This migration enhances the roles system with:
 * - Permissions table for granular permissions
 * - Role-permissions join table with granted/denied flag
 * - Role hierarchy support (parent_role_id in roles table)
 * - Default system roles and permissions seeding
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class RolesPermissions0000000000003 implements MigrationInterface {
  name = 'RolesPermissions0000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add parent_role_id to roles table for hierarchy support
    await queryRunner.query(`
      ALTER TABLE roles 
      ADD COLUMN IF NOT EXISTS parent_role_id BIGINT REFERENCES roles(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_parent 
      ON roles (parent_role_id)
    `);

    // Permissions table - Granular permissions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id                      BIGSERIAL PRIMARY KEY,
        permission_key           VARCHAR(128) UNIQUE NOT NULL,
        name                    VARCHAR(255) NOT NULL,
        description             TEXT,
        resource_type           VARCHAR(128),
        action                  VARCHAR(64),
        is_system               BOOLEAN NOT NULL DEFAULT false,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_permissions_key 
      ON permissions (permission_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_permissions_resource 
      ON permissions (resource_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_permissions_system 
      ON permissions (is_system)
    `);

    // Role permissions - Many-to-many mapping with granted/denied flag
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id                 BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id           BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted                 BOOLEAN NOT NULL DEFAULT true,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
      ON role_permissions (role_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_perm 
      ON role_permissions (permission_id)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE permissions IS 'Granular permissions for RBAC system'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE role_permissions IS 'Role-permission assignments with granted/denied flag'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN role_permissions.granted IS 'true = grant permission, false = deny permission (explicit denial)'
    `);

    // Seed default system permissions
    await queryRunner.query(`
      INSERT INTO permissions (permission_key, name, description, resource_type, action, is_system) VALUES
      -- Employee permissions
      ('employee.create', 'Create Employee', 'Create new employee records', 'EMPLOYEE', 'CREATE', true),
      ('employee.read', 'Read Employee', 'View employee information', 'EMPLOYEE', 'READ', true),
      ('employee.update', 'Update Employee', 'Update employee information', 'EMPLOYEE', 'UPDATE', true),
      ('employee.delete', 'Delete Employee', 'Delete employee records', 'EMPLOYEE', 'DELETE', true),
      ('employee.export', 'Export Employee', 'Export employee data', 'EMPLOYEE', 'EXPORT', true),
      
      -- Project permissions
      ('project.create', 'Create Project', 'Create new projects', 'PROJECT', 'CREATE', true),
      ('project.read', 'Read Project', 'View project information', 'PROJECT', 'READ', true),
      ('project.update', 'Update Project', 'Update project information', 'PROJECT', 'UPDATE', true),
      ('project.delete', 'Delete Project', 'Delete projects', 'PROJECT', 'DELETE', true),
      ('project.approve', 'Approve Project', 'Approve project requests', 'PROJECT', 'APPROVE', true),
      
      -- Time Off permissions
      ('timeoff.create', 'Create Time Off', 'Submit time off requests', 'TIME_OFF', 'CREATE', true),
      ('timeoff.read', 'Read Time Off', 'View time off requests', 'TIME_OFF', 'READ', true),
      ('timeoff.update', 'Update Time Off', 'Update time off requests', 'TIME_OFF', 'UPDATE', true),
      ('timeoff.delete', 'Delete Time Off', 'Delete time off requests', 'TIME_OFF', 'DELETE', true),
      ('timeoff.approve', 'Approve Time Off', 'Approve time off requests', 'TIME_OFF', 'APPROVE', true),
      ('timeoff.reject', 'Reject Time Off', 'Reject time off requests', 'TIME_OFF', 'REJECT', true),
      
      -- Attendance permissions
      ('attendance.create', 'Create Attendance', 'Record attendance', 'ATTENDANCE', 'CREATE', true),
      ('attendance.read', 'Read Attendance', 'View attendance records', 'ATTENDANCE', 'READ', true),
      ('attendance.update', 'Update Attendance', 'Update attendance records', 'ATTENDANCE', 'UPDATE', true),
      ('attendance.delete', 'Delete Attendance', 'Delete attendance records', 'ATTENDANCE', 'DELETE', true),
      ('attendance.approve', 'Approve Attendance', 'Approve attendance records', 'ATTENDANCE', 'APPROVE', true),
      
      -- Payroll permissions
      ('payroll.read', 'Read Payroll', 'View payroll information', 'PAYROLL', 'READ', true),
      ('payroll.update', 'Update Payroll', 'Update payroll information', 'PAYROLL', 'UPDATE', true),
      ('payroll.approve', 'Approve Payroll', 'Approve payroll', 'PAYROLL', 'APPROVE', true),
      ('payroll.export', 'Export Payroll', 'Export payroll data', 'PAYROLL', 'EXPORT', true),
      
      -- Organization permissions
      ('organization.create', 'Create Organization', 'Create organizations', 'ORGANIZATION', 'CREATE', true),
      ('organization.read', 'Read Organization', 'View organization information', 'ORGANIZATION', 'READ', true),
      ('organization.update', 'Update Organization', 'Update organization information', 'ORGANIZATION', 'UPDATE', true),
      ('organization.delete', 'Delete Organization', 'Delete organizations', 'ORGANIZATION', 'DELETE', true),
      
      -- User management permissions
      ('user.create', 'Create User', 'Create user accounts', 'USER', 'CREATE', true),
      ('user.read', 'Read User', 'View user information', 'USER', 'READ', true),
      ('user.update', 'Update User', 'Update user accounts', 'USER', 'UPDATE', true),
      ('user.delete', 'Delete User', 'Delete user accounts', 'USER', 'DELETE', true),
      ('user.activate', 'Activate User', 'Activate user accounts', 'USER', 'ACTIVATE', true),
      ('user.deactivate', 'Deactivate User', 'Deactivate user accounts', 'USER', 'DEACTIVATE', true),
      
      -- Role management permissions
      ('role.create', 'Create Role', 'Create roles', 'ROLE', 'CREATE', true),
      ('role.read', 'Read Role', 'View role information', 'ROLE', 'READ', true),
      ('role.update', 'Update Role', 'Update roles', 'ROLE', 'UPDATE', true),
      ('role.delete', 'Delete Role', 'Delete roles', 'ROLE', 'DELETE', true),
      ('role.assign', 'Assign Role', 'Assign roles to users', 'ROLE', 'ASSIGN', true),
      
      -- Permission management permissions
      ('permission.read', 'Read Permission', 'View permissions', 'PERMISSION', 'READ', true),
      ('permission.assign', 'Assign Permission', 'Assign permissions to roles', 'PERMISSION', 'ASSIGN', true),
      
      -- Report permissions
      ('report.read', 'Read Report', 'View reports', 'REPORT', 'READ', true),
      ('report.create', 'Create Report', 'Create custom reports', 'REPORT', 'CREATE', true),
      ('report.export', 'Export Report', 'Export reports', 'REPORT', 'EXPORT', true),
      
      -- Settings permissions
      ('settings.read', 'Read Settings', 'View system settings', 'SETTINGS', 'READ', true),
      ('settings.update', 'Update Settings', 'Update system settings', 'SETTINGS', 'UPDATE', true)
      ON CONFLICT (permission_key) DO NOTHING
    `);

    // Seed default system roles
    // Note: These roles will be created if they don't exist
    // We'll use a more complex approach to handle role creation and permission assignment
    
    // First, ensure default roles exist
    await queryRunner.query(`
      INSERT INTO roles (name, description, is_system_role) VALUES
      ('ADMIN', 'Administrator with full system access', true),
      ('HR', 'Human Resources role with employee and HR management access', true),
      ('MANAGER', 'Manager role with team management access', true),
      ('EMPLOYEE', 'Basic employee role with limited access', true)
      ON CONFLICT (name) DO NOTHING
    `);

    // Assign permissions to ADMIN role (all permissions)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT r.id, p.id, true
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'ADMIN'
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
      )
    `);

    // Assign permissions to HR role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT r.id, p.id, true
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'HR'
      AND p.permission_key IN (
        'employee.create', 'employee.read', 'employee.update', 'employee.delete', 'employee.export',
        'timeoff.read', 'timeoff.approve', 'timeoff.reject',
        'attendance.read', 'attendance.update', 'attendance.approve',
        'payroll.read', 'payroll.update', 'payroll.approve', 'payroll.export',
        'user.read', 'user.update', 'user.activate', 'user.deactivate',
        'report.read', 'report.create', 'report.export',
        'settings.read'
      )
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
      )
    `);

    // Assign permissions to MANAGER role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT r.id, p.id, true
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'MANAGER'
      AND p.permission_key IN (
        'employee.read',
        'project.create', 'project.read', 'project.update', 'project.approve',
        'timeoff.read', 'timeoff.approve', 'timeoff.reject',
        'attendance.read', 'attendance.approve',
        'report.read', 'report.export'
      )
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
      )
    `);

    // Assign permissions to EMPLOYEE role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT r.id, p.id, true
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'EMPLOYEE'
      AND p.permission_key IN (
        'employee.read',
        'timeoff.create', 'timeoff.read', 'timeoff.update',
        'attendance.create', 'attendance.read',
        'report.read'
      )
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions CASCADE`);
    
    // Remove parent_role_id column from roles table
    await queryRunner.query(`
      ALTER TABLE roles 
      DROP COLUMN IF EXISTS parent_role_id CASCADE
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_roles_parent
    `);
  }
}

