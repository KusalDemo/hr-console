import { DataSource } from 'typeorm';
import { Organization } from '../../src/organizations/entities/organization.entity';

/**
 * Organization Fixtures
 * 
 * Factory functions for creating test organization data
 */
export class OrganizationFixture {
  /**
   * Create a test organization
   */
  static async createOrganization(
    dataSource: DataSource,
    overrides: Partial<Organization> = {},
  ): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    
    const organization = orgRepo.create({
      name: overrides.name || `Test Organization ${Date.now()}`,
      code: overrides.code || `ORG_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      status: overrides.status || 'active',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides,
    });

    return await orgRepo.save(organization);
  }

  /**
   * Create multiple test organizations
   */
  static async createOrganizations(
    dataSource: DataSource,
    count: number,
    overrides: Partial<Organization> = {},
  ): Promise<Organization[]> {
    const organizations: Organization[] = [];
    for (let i = 0; i < count; i++) {
      const org = await this.createOrganization(dataSource, {
        ...overrides,
        name: overrides.name || `Test Organization ${i}`,
        code: overrides.code || `ORG_${i}_${Date.now()}`,
      });
      organizations.push(org);
    }
    return organizations;
  }
}


