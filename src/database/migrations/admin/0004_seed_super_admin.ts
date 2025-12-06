import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed default super admin user
 * Default credentials: superadmin@system.com / SuperAdmin123!
 * ⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!
 * 
 * BCrypt hash for "SuperAdmin123!" (12 rounds)
 * This hash should be regenerated for production use
 */
export class SeedSuperAdmin0000000000004 implements MigrationInterface {
  name = 'SeedSuperAdmin0000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // BCrypt hash for "SuperAdmin123!" with 12 rounds
    // Generated using: bcrypt.hash('SuperAdmin123!', 12)
    const passwordHash = '$2b$12$nYYdeUnllAlNgx8rsB4NMeBoX7slxlXYjKxop7Nnl4suk6rBKAJnO';

    await queryRunner.query(`
      INSERT INTO admin.super_admin (
        email,
        password_hash,
        full_name,
        is_active,
        created_at,
        updated_at,
        is_locked,
        failed_login_attempts,
        requires_password_change,
        mfa_enabled
      ) VALUES (
        'superadmin@system.com',
        $1,
        'Super Administrator',
        true,
        NOW(),
        NOW(),
        false,
        0,
        true,
        false
      ) ON CONFLICT (email) DO NOTHING
    `, [passwordHash]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the seeded super admin (only if it matches the default email)
    await queryRunner.query(`
      DELETE FROM admin.super_admin 
      WHERE email = 'superadmin@system.com'
    `);
  }
}

