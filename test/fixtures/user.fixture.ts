import { DataSource } from 'typeorm';
import { User } from '../../src/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { OrganizationMembership } from '../../src/organizations/entities/organization-membership.entity';
import * as bcrypt from 'bcrypt';

/**
 * User Fixtures
 * 
 * Factory functions for creating test user data
 */
export class UserFixture {
  /**
   * Create a test user
   */
  static async createUser(
    dataSource: DataSource,
    overrides: Partial<User> = {},
  ): Promise<User> {
    const userRepo = dataSource.getRepository(User);
    
    const password = overrides.passwordHash || 'TestPassword123!';
    const passwordHash = typeof password === 'string' && !password.startsWith('$2')
      ? await bcrypt.hash(password, 10)
      : password;

    const user = userRepo.create({
      email: overrides.email || `user_${Date.now()}@test.com`,
      passwordHash,
      fullName: overrides.fullName || 'Test User',
      active: overrides.active !== undefined ? overrides.active : true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides,
    });

    return await userRepo.save(user);
  }

  /**
   * Create a user with organization membership
   */
  static async createUserWithOrganization(
    dataSource: DataSource,
    organizationId: number,
    userOverrides: Partial<User> = {},
    membershipOverrides: Partial<OrganizationMembership> = {},
  ): Promise<{ user: User; membership: OrganizationMembership }> {
    const user = await this.createUser(dataSource, userOverrides);
    const membershipRepo = dataSource.getRepository(OrganizationMembership);

    const membership = membershipRepo.create({
      userId: user.id,
      organizationId,
      isPrimary: membershipOverrides.isPrimary !== undefined ? membershipOverrides.isPrimary : true,
      joinedAt: membershipOverrides.joinedAt || new Date(),
      ...membershipOverrides,
    });

    const savedMembership = await membershipRepo.save(membership);
    return { user, membership: savedMembership };
  }

  /**
   * Create multiple test users
   */
  static async createUsers(
    dataSource: DataSource,
    count: number,
    overrides: Partial<User> = {},
  ): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser(dataSource, {
        ...overrides,
        email: overrides.email || `user_${i}_${Date.now()}@test.com`,
        fullName: overrides.fullName || `Test User ${i}`,
      });
      users.push(user);
    }
    return users;
  }
}
