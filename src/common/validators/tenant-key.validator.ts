import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidTenantKey', async: false })
export class IsValidTenantKeyConstraint implements ValidatorConstraintInterface {
  validate(tenantKey: string): boolean {
    if (!tenantKey || typeof tenantKey !== 'string') {
      return false;
    }

    // Tenant key must be lowercase alphanumeric with hyphens/underscores
    // Length between 3 and 64 characters
    const tenantKeyRegex = /^[a-z0-9]([a-z0-9\-_]{1,62}[a-z0-9])?$/;

    return tenantKeyRegex.test(tenantKey) && tenantKey.length >= 3 && tenantKey.length <= 64;
  }

  defaultMessage(): string {
    return 'Tenant key must be 3-64 characters, lowercase alphanumeric with hyphens or underscores, and cannot start or end with a hyphen or underscore';
  }
}

/**
 * Validates that a string is a valid tenant key format
 */
export function IsValidTenantKey(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTenantKeyConstraint,
    });
  };
}
