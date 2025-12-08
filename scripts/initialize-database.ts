import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

/**
 * Script to initialize the database from scratch
 * This will:
 * 1. Create the admin schema
 * 2. Run all admin migrations
 * 3. Create the public schema if needed
 */
async function initializeDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hr_console_db',
    // Don't set schema here - we'll work with default schema first
    synchronize: false,
    logging: ['error', 'warn', 'schema'],
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Step 1: Create admin schema
      console.log('📦 Creating admin schema...');
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS admin`);
      console.log('✅ Admin schema created');

      // Step 2: Create migrations table in admin schema
      console.log('📦 Creating migrations table in admin schema...');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS admin.migrations (
          id SERIAL PRIMARY KEY,
          timestamp BIGINT NOT NULL,
          name VARCHAR(255) NOT NULL,
          UNIQUE(timestamp, name)
        )
      `);
      console.log('✅ Migrations table created');

      // Step 3: Run admin migrations manually
      console.log('📦 Running admin migrations...');
      
      // Import and run migrations
      const migration1 = await import('../src/database/migrations/admin/0001_create_admin_schema');
      const migration2 = await import('../src/database/migrations/admin/0002_create_subscription_tables');
      const migration3 = await import('../src/database/migrations/admin/0003_create_audit_logs');
      const migration4 = await import('../src/database/migrations/admin/0004_seed_super_admin');
      const migration5 = await import('../src/database/migrations/admin/0005_create_job_queues');

      const migrations = [
        new migration1.CreateAdminSchema0000000000001(),
        new migration2.CreateSubscriptionTables0000000000002(),
        new migration3.CreateAuditLogs0000000000003(),
        new migration5.CreateJobQueues0000000000005(),
        new migration4.SeedSuperAdmin0000000000004(), // Run seed last
      ];

      for (const migration of migrations) {
        // Check if migration already ran
        const existing = await queryRunner.query(
          `SELECT id FROM admin.migrations WHERE name = $1`,
          [migration.name]
        );

        if (existing.length === 0) {
          console.log(`  Running migration: ${migration.name}`);
          await migration.up(queryRunner);
          
          // Record migration
          await queryRunner.query(
            `INSERT INTO admin.migrations (timestamp, name) VALUES ($1, $2)`,
            [Date.now(), migration.name]
          );
          console.log(`  ✅ ${migration.name} completed`);
        } else {
          console.log(`  ⏭️  ${migration.name} already run, skipping`);
        }
      }

      console.log('✅ All admin migrations completed');

      // Step 4: Verify tables exist
      console.log('📦 Verifying tables...');
      const tables = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'admin'
        ORDER BY table_name
      `);
      
      console.log(`✅ Found ${tables.length} tables in admin schema:`);
      tables.forEach((table: any) => {
        console.log(`   - ${table.table_name}`);
      });

      console.log('\n✅ Database initialization completed successfully!');
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

initializeDatabase();
