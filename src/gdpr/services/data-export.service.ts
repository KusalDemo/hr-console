import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DataSubjectType } from '../entities/data-subject-request.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

/**
 * Data Export Service
 *
 * Handles data export for GDPR data portability requests.
 * Exports user data in various formats (JSON, CSV, XML, PDF, ZIP).
 */
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  private readonly exportDir = process.env.EXPORT_DIR || './exports';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Ensure export directory exists
    this.ensureExportDirectory();
  }

  /**
   * Export user data package
   */
  async exportUserData(
    identifier: string,
    dataSubjectType: DataSubjectType,
    format: 'JSON' | 'CSV' | 'XML' | 'ZIP' = 'ZIP',
  ): Promise<string> {
    // Find user
    const user = await this.findUserByIdentifier(identifier, dataSubjectType);
    if (!user) {
      throw new Error('User not found');
    }

    // Collect all user data
    const userData = await this.collectUserData(user.id);

    // Export based on format
    switch (format) {
      case 'JSON':
        return this.exportAsJson(user.id, userData);
      case 'CSV':
        return this.exportAsCsv(user.id, userData);
      case 'XML':
        return this.exportAsXml(user.id, userData);
      case 'ZIP':
        return this.exportAsZip(user.id, userData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Collect all user data from various sources
   */
  private async collectUserData(userId: number): Promise<Record<string, any>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Collect data from various modules
    // TODO: Add more data sources as modules are integrated
    const userData: Record<string, any> = {
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        passwordChangedAt: user.passwordChangedAt,
        mfaEnabled: user.mfaEnabled,
      },
      roles:
        user.roles?.map((role) => ({
          id: role.id,
          name: role.name,
        })) || [],
      // Add more data sources here:
      // - Time entries
      // - Leave requests
      // - Performance reviews
      // - Documents
      // - etc.
    };

    return userData;
  }

  /**
   * Export as JSON
   */
  private async exportAsJson(userId: number, data: Record<string, any>): Promise<string> {
    const filename = `user-${userId}-export-${Date.now()}.json`;
    const filepath = path.join(this.exportDir, filename);

    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

    return filepath;
  }

  /**
   * Export as CSV
   */
  private async exportAsCsv(userId: number, data: Record<string, any>): Promise<string> {
    const filename = `user-${userId}-export-${Date.now()}.csv`;
    const filepath = path.join(this.exportDir, filename);

    // Convert data to CSV format
    const csvLines: string[] = [];
    csvLines.push('Section,Field,Value');

    for (const [section, sectionData] of Object.entries(data)) {
      if (typeof sectionData === 'object' && sectionData !== null) {
        for (const [field, value] of Object.entries(sectionData)) {
          const csvValue = this.escapeCsvValue(String(value));
          csvLines.push(`${section},${field},${csvValue}`);
        }
      }
    }

    await fs.writeFile(filepath, csvLines.join('\n'), 'utf-8');

    return filepath;
  }

  /**
   * Export as XML
   */
  private async exportAsXml(userId: number, data: Record<string, any>): Promise<string> {
    const filename = `user-${userId}-export-${Date.now()}.xml`;
    const filepath = path.join(this.exportDir, filename);

    const xml = this.convertToXml(data, 'userData');
    await fs.writeFile(filepath, xml, 'utf-8');

    return filepath;
  }

  /**
   * Export as ZIP (multiple formats)
   */
  private async exportAsZip(userId: number, data: Record<string, any>): Promise<string> {
    const zipFilename = `user-${userId}-export-${Date.now()}.zip`;
    const zipFilepath = path.join(this.exportDir, zipFilename);

    // Create ZIP archive
    const output = createWriteStream(zipFilepath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        this.logger.log(`ZIP archive created: ${zipFilepath} (${archive.pointer()} bytes)`);
        resolve(zipFilepath);
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Add JSON file
      archive.append(JSON.stringify(data, null, 2), {
        name: 'data.json',
      });

      // Add CSV file
      const csvLines: string[] = [];
      csvLines.push('Section,Field,Value');
      for (const [section, sectionData] of Object.entries(data)) {
        if (typeof sectionData === 'object' && sectionData !== null) {
          for (const [field, value] of Object.entries(sectionData)) {
            const csvValue = this.escapeCsvValue(String(value));
            csvLines.push(`${section},${field},${csvValue}`);
          }
        }
      }
      archive.append(csvLines.join('\n'), { name: 'data.csv' });

      // Add XML file
      archive.append(this.convertToXml(data, 'userData'), {
        name: 'data.xml',
      });

      // Add README
      const readme = `User Data Export
Generated: ${new Date().toISOString()}
User ID: ${userId}

This export contains all personal data associated with this user account.
Formats included: JSON, CSV, XML

For questions or concerns, please contact the data protection officer.
`;
      archive.append(readme, { name: 'README.txt' });

      archive.finalize();
    });
  }

  // Private helper methods

  private async findUserByIdentifier(
    identifier: string,
    dataSubjectType: DataSubjectType,
  ): Promise<User | null> {
    if (dataSubjectType === DataSubjectType.USER) {
      // Try by email first
      let user = await this.userRepository.findOne({
        where: { email: identifier },
      });

      // Try by ID if not found
      if (!user && !isNaN(parseInt(identifier, 10))) {
        user = await this.userRepository.findOne({
          where: { id: parseInt(identifier, 10) },
        });
      }

      return user;
    }

    // TODO: Handle other data subject types (EMPLOYEE, CANDIDATE, etc.)
    return null;
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private convertToXml(data: any, rootElement: string = 'root'): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;

    const addElement = (obj: any, indent: number = 1): string => {
      let result = '';
      const spaces = '  '.repeat(indent);

      for (const [key, value] of Object.entries(obj)) {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result += `${spaces}<${safeKey}>\n`;
          result += addElement(value, indent + 1);
          result += `${spaces}</${safeKey}>\n`;
        } else if (Array.isArray(value)) {
          result += `${spaces}<${safeKey}>\n`;
          for (const item of value) {
            if (typeof item === 'object' && item !== null) {
              result += addElement(item, indent + 1);
            } else {
              result += `${spaces}  <item>${this.escapeXml(String(item))}</item>\n`;
            }
          }
          result += `${spaces}</${safeKey}>\n`;
        } else {
          result += `${spaces}<${safeKey}>${this.escapeXml(String(value))}</${safeKey}>\n`;
        }
      }

      return result;
    };

    xml += addElement(data);
    xml += `</${rootElement}>`;

    return xml;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
