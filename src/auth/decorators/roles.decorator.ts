import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator
 * Specifies which roles are required to access an endpoint
 * Use this decorator along with RolesGuard to enforce role-based access control
 *
 * @param roles - Array of role names (with or without ROLE_ prefix)
 *
 * @example
 * @Roles('ROLE_ADMIN', 'ROLE_HR')
 * @Get('employees')
 * getEmployees() {
 *   return this.employeesService.findAll();
 * }
 *
 * @example
 * @Roles('ADMIN', 'HR') // ROLE_ prefix will be added automatically
 * @Get('reports')
 * getReports() {
 *   return this.reportsService.findAll();
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

