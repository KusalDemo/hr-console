import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationException } from '../exceptions/business.exception';

/**
 * Enhanced validation pipe with better error messages
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform {
  async transform(value: unknown, { metatype, type }: ArgumentMetadata): Promise<unknown> {
    // Skip validation for primitive types
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Skip validation for request body/query/param if value is not an object
    if (type === 'body' && typeof value !== 'object') {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });

    if (errors.length > 0) {
      const errorMessages = this.formatErrors(errors);
      throw new ValidationException('Validation failed', errorMessages);
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints || {};

      if (Object.keys(constraints).length > 0) {
        formatted[property] = Object.values(constraints) as string[];
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatErrors(error.children);
        Object.keys(nestedErrors).forEach((nestedKey) => {
          formatted[`${property}.${nestedKey}`] = nestedErrors[nestedKey];
        });
      }
    });

    return formatted;
  }
}

