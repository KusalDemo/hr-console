import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

// Load environment variables
config();

/**
 * Script to create a tenant with tenant admin
 * Usage: ts-node scripts/create-tenant.ts <tenantKey> <tenantName> <adminEmail> <adminPassword> <adminFullName>
 */
async function createTenant() {
  const args = process.argv.slice(2);
  
  if (args.length < 5) {
    console.log('Usage: ts-node scripts/create-tenant.ts <tenantKey> <tenantName> <adminEmail> <adminPassword> <adminFullName>');
    console.log('\nExample:');
    console.log('  ts-node scripts/create-tenant.ts kusalsdemo "Kusal Demo (PVT) LTD" g.unasekarakusal@gmail.com Solution@123 "Kusal Gunasekara"');
    process.exit(1);
  }

  const [tenantKey, tenantName, adminEmail, adminPassword, adminFullName] = args;

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hr_console_db',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established\n');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Check if tenant already exists
      const existingTenant = await queryRunner.query(
        `SELECT id, tenant_key, name FROM admin.tenants WHERE LOWER(tenant_key) = LOWER($1)`,
        [tenantKey.toLowerCase()]
      );

      if (existingTenant.length > 0) {
        console.log(`❌ Tenant with key "${tenantKey}" already exists:`);
        console.log(JSON.stringify(existingTenant[0], null, 2));
        process.exit(1);
      }

      // Step 1: Create tenant record
      console.log(`📦 Creating tenant: ${tenantKey}...`);
      const tenantResult = await queryRunner.query(
        `INSERT INTO admin.tenants (tenant_key, name, is_active, created_at, updated_at)
         VALUES ($1, $2, true, now(), now())
         RETURNING id, tenant_key, name`,
        [tenantKey.toLowerCase(), tenantName]
      );
      const tenant = tenantResult[0];
      console.log(`✅ Tenant created: ID=${tenant.id}, Key=${tenant.tenant_key}, Name=${tenant.name}\n`);

      // Step 2: Hash password
      console.log('📦 Hashing password...');
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      console.log('✅ Password hashed\n');

      // Step 3: Create tenant admin
      console.log(`📦 Creating tenant admin: ${adminEmail}...`);
      const normalizedEmail = adminEmail.trim().toLowerCase();
      const adminResult = await queryRunner.query(
        `INSERT INTO admin.tenant_admin (
          tenant_id, email, password_hash, full_name, is_active, 
          is_locked, failed_login_attempts, requires_password_change, mfa_enabled,
          created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, true, false, 0, false, false, now(), now())
         RETURNING id, email, full_name, is_active`,
        [tenant.id, normalizedEmail, passwordHash, adminFullName]
      );
      const admin = adminResult[0];
      console.log(`✅ Tenant admin created: ID=${admin.id}, Email=${admin.email}, Name=${admin.full_name}\n`);

      // Step 4: Create tenant schema
      const schemaName = `t_${tenantKey.toLowerCase()}`;
      console.log(`📦 Creating tenant schema: ${schemaName}...`);
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      console.log(`✅ Tenant schema created: ${schemaName}\n`);

      console.log('✅ Tenant creation completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`   Tenant Key: ${tenant.tenant_key}`);
      console.log(`   Tenant Name: ${tenant.name}`);
      console.log(`   Tenant ID: ${tenant.id}`);
      console.log(`   Schema: ${schemaName}`);
      console.log(`   Admin Email: ${admin.email}`);
      console.log(`   Admin Name: ${admin.full_name}`);
      console.log('\n⚠️  Note: You still need to run tenant migrations to create tables in the tenant schema.');
      console.log('   Use the tenant provisioning service or run tenant migrations manually.');

    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Error creating tenant:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

createTenant();
