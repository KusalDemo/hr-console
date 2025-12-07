import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { ImportJob, ImportJobStatus, ImportFormat } from '../entities/import-job.entity';
import { ImportTemplate } from '../entities/import-template.entity';

/**
 * Import Processor Service
 *
 * Handles the actual processing of import files:
 * - File parsing (CSV, Excel, JSON)
 * - Data transformation
 * - Validation
 * - Batch processing
 * - Error handling
 *
 * Note: Requires additional packages:
 * - csv-parser or papaparse for CSV
 * - xlsx or exceljs for Excel
 * - Built-in JSON support
 */
@Injectable()
export class ImportProcessorService {
  private readonly logger = new Logger(ImportProcessorService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Parse file based on format
   */
  async parseFile(filePath: string, format: ImportFormat): Promise<Array<Record<string, any>>> {
    try {
      switch (format) {
        case ImportFormat.CSV:
          return await this.parseCSV(filePath);
        case ImportFormat.EXCEL:
          return await this.parseExcel(filePath);
        case ImportFormat.JSON:
          return await this.parseJSON(filePath);
        default:
          throw new BadRequestException(`Unsupported import format: ${format}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse file: ${filePath}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to parse file: ${errorMessage}`);
    }
  }

  /**
   * Parse CSV file
   * Note: Requires csv-parser or papaparse package
   */
  private async parseCSV(filePath: string): Promise<Array<Record<string, any>>> {
    // TODO: Install and use csv-parser or papaparse
    // Example with csv-parser:
    // const results = [];
    // return new Promise((resolve, reject) => {
    //   fs.createReadStream(filePath)
    //     .pipe(csv())
    //     .on('data', (data) => results.push(data))
    //     .on('end', () => resolve(results))
    //     .on('error', reject);
    // });

    throw new BadRequestException(
      'CSV parsing not yet implemented. Please install csv-parser package.',
    );
  }

  /**
   * Parse Excel file
   * Note: Requires xlsx or exceljs package
   */
  private async parseExcel(filePath: string): Promise<Array<Record<string, any>>> {
    // TODO: Install and use xlsx or exceljs
    // Example with xlsx:
    // const workbook = xlsx.readFile(filePath);
    // const sheetName = workbook.SheetNames[0];
    // const worksheet = workbook.Sheets[sheetName];
    // return xlsx.utils.sheet_to_json(worksheet);

    throw new BadRequestException(
      'Excel parsing not yet implemented. Please install xlsx or exceljs package.',
    );
  }

  /**
   * Parse JSON file
   */
  private async parseJSON(filePath: string): Promise<Array<Record<string, any>>> {
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Handle both array and object formats
      if (Array.isArray(data)) {
        return data;
      } else if (typeof data === 'object' && data !== null) {
        // If it's an object with a data property, extract it
        if (data.data && Array.isArray(data.data)) {
          return data.data;
        }
        // Otherwise, wrap in array
        return [data];
      }

      throw new BadRequestException('Invalid JSON format. Expected array or object.');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException(`Invalid JSON format: ${error.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to parse JSON: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Transform data based on template rules
   */
  transformData(
    data: Array<Record<string, any>>,
    template: ImportTemplate | null,
  ): Array<Record<string, any>> {
    if (!template || !template.transformationRules) {
      return data;
    }

    return data.map((record) => {
      const transformed: Record<string, any> = {};

      // Apply field mappings
      const fieldMappings = template.fieldMappings || {};
      Object.keys(record).forEach((sourceKey) => {
        const targetKey = fieldMappings[sourceKey] || sourceKey;
        transformed[targetKey] = record[sourceKey];
      });

      // Apply transformations
      const transformationRules = template.transformationRules || {};
      Object.keys(transformationRules).forEach((field) => {
        if (transformed[field] !== undefined) {
          transformed[field] = this.applyTransformation(
            transformed[field],
            transformationRules[field],
          );
        }
      });

      // Apply default values
      const defaultValues = template.defaultValues || {};
      Object.keys(defaultValues).forEach((field) => {
        if (
          transformed[field] === undefined ||
          transformed[field] === null ||
          transformed[field] === ''
        ) {
          transformed[field] = defaultValues[field];
        }
      });

      return transformed;
    });
  }

  /**
   * Apply transformation rule to a value
   */
  private applyTransformation(value: any, rule: any): any {
    if (!rule || typeof rule !== 'object') {
      return value;
    }

    // Uppercase transformation
    if (rule.transform === 'uppercase' && typeof value === 'string') {
      return value.toUpperCase();
    }

    // Lowercase transformation
    if (rule.transform === 'lowercase' && typeof value === 'string') {
      return value.toLowerCase();
    }

    // Trim transformation
    if (rule.transform === 'trim' && typeof value === 'string') {
      return value.trim();
    }

    // Date format transformation
    if (rule.format && typeof value === 'string') {
      // TODO: Implement date formatting based on rule.format
      // This would require a date library like date-fns or moment
      return value;
    }

    // Custom function transformation
    if (rule.function && typeof rule.function === 'string') {
      // TODO: Implement custom function evaluation (with security considerations)
      return value;
    }

    return value;
  }

  /**
   * Validate data based on template rules
   */
  validateData(
    data: Array<Record<string, any>>,
    template: ImportTemplate | null,
  ): Array<{ row: number; errors: string[]; data: any }> {
    const errors: Array<{ row: number; errors: string[]; data: any }> = [];

    if (!template || !template.validationRules) {
      return errors;
    }

    const validationRules = template.validationRules;

    data.forEach((record, index) => {
      const rowErrors: string[] = [];

      Object.keys(validationRules).forEach((field) => {
        const rule = validationRules[field];
        const value = record[field];

        // Required validation
        if (rule.required && (value === undefined || value === null || value === '')) {
          rowErrors.push(`Field '${field}' is required`);
        }

        // Type validation
        if (value !== undefined && value !== null && value !== '') {
          if (rule.type === 'email' && !this.isValidEmail(value)) {
            rowErrors.push(`Field '${field}' must be a valid email`);
          }

          if (rule.type === 'number' && isNaN(Number(value))) {
            rowErrors.push(`Field '${field}' must be a number`);
          }

          if (rule.type === 'date' && !this.isValidDate(value)) {
            rowErrors.push(`Field '${field}' must be a valid date`);
          }

          // Min/Max validation for numbers
          if (rule.type === 'number') {
            const numValue = Number(value);
            if (rule.min !== undefined && numValue < rule.min) {
              rowErrors.push(`Field '${field}' must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && numValue > rule.max) {
              rowErrors.push(`Field '${field}' must be at most ${rule.max}`);
            }
          }

          // MinLength/MaxLength validation for strings
          if (typeof value === 'string') {
            if (rule.minLength !== undefined && value.length < rule.minLength) {
              rowErrors.push(`Field '${field}' must be at least ${rule.minLength} characters`);
            }
            if (rule.maxLength !== undefined && value.length > rule.maxLength) {
              rowErrors.push(`Field '${field}' must be at most ${rule.maxLength} characters`);
            }
          }
        }
      });

      if (rowErrors.length > 0) {
        errors.push({
          row: index + 1, // 1-based row number
          errors: rowErrors,
          data: record,
        });
      }
    });

    return errors;
  }

  /**
   * Check if value is a valid email
   */
  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Check if value is a valid date
   */
  private isValidDate(value: any): boolean {
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * Detect duplicates based on template configuration
   */
  detectDuplicates(data: Array<Record<string, any>>, template: ImportTemplate | null): Set<number> {
    const duplicateRows = new Set<number>();

    if (!template || !template.duplicateDetection) {
      return duplicateRows;
    }

    const duplicateConfig = template.duplicateDetection;
    const fields = duplicateConfig.fields || [];

    if (fields.length === 0) {
      return duplicateRows;
    }

    const seen = new Map<string, number>();

    data.forEach((record, index) => {
      // Create a key from the duplicate detection fields
      const key = fields.map((field: string) => String(record[field] || '')).join('|');

      if (key && seen.has(key)) {
        duplicateRows.add(index + 1); // 1-based row number
        if (duplicateConfig.markBoth !== false) {
          duplicateRows.add(seen.get(key)!);
        }
      } else if (key) {
        seen.set(key, index + 1);
      }
    });

    return duplicateRows;
  }

  /**
   * Process records in batches
   */
  async processBatch(
    records: Array<Record<string, any>>,
    batchSize: number,
    processor: (batch: Array<Record<string, any>>) => Promise<void>,
  ): Promise<void> {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await processor(batch);
    }
  }
}
