import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Script to check tenant admin data in the database
 */
async function checkTenantAdmin() {
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

    // Check all tenants
    console.log('📦 Checking tenants...');
    const tenants = await dataSource.query(
      `SELECT id, tenant_key, name, is_active FROM admin.tenants ORDER BY id`
    );
    console.log(`Found ${tenants.length} tenant(s):`);
    tenants.forEach((tenant: any) => {
      console.log(`  - ID: ${tenant.id}, Key: ${tenant.tenant_key}, Name: ${tenant.name}, Active: ${tenant.is_active}`);
    });
    console.log('');

    // Check all tenant admins
    console.log('📦 Checking tenant admins...');
    const tenantAdmins = await dataSource.query(
      `SELECT ta.id, ta.email, ta.full_name, ta.is_active, ta.tenant_id, t.tenant_key, t.name as tenant_name
       FROM admin.tenant_admin ta
       LEFT JOIN admin.tenants t ON ta.tenant_id = t.id
       ORDER BY ta.id`
    );
    console.log(`Found ${tenantAdmins.length} tenant admin(s):`);
    tenantAdmins.forEach((admin: any) => {
      console.log(`  - ID: ${admin.id}`);
      console.log(`    Email: "${admin.email}" (length: ${admin.email?.length || 0})`);
      console.log(`    Full Name: ${admin.full_name}`);
      console.log(`    Active: ${admin.is_active}`);
      console.log(`    Tenant ID: ${admin.tenant_id}, Key: ${admin.tenant_key}, Name: ${admin.tenant_name}`);
      console.log('');
    });

    // Test query for specific tenant and email
    const testTenantKey = 'kusalsdemo';
    const testEmail = 'g.unasekarakusal@gmail.com';
    console.log(`\n🔍 Testing query for tenant: "${testTenantKey}", email: "${testEmail}"`);
    
    const result = await dataSource.query(
      `SELECT ta.id, ta.email, ta.full_name, ta.is_active, t.tenant_key
       FROM admin.tenant_admin ta
       INNER JOIN admin.tenants t ON ta.tenant_id = t.id
       WHERE LOWER(TRIM(ta.email)) = LOWER(TRIM($1))
         AND ta.is_active = true
         AND LOWER(TRIM(t.tenant_key)) = LOWER(TRIM($2))
         AND t.is_active = true
       LIMIT 1`,
      [testEmail, testTenantKey]
    );

    if (result.length > 0) {
      console.log('✅ Query found tenant admin:');
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('❌ Query did not find tenant admin');
      console.log('\nChecking if tenant exists...');
      const tenantCheck = await dataSource.query(
        `SELECT id, tenant_key, name, is_active FROM admin.tenants WHERE LOWER(tenant_key) = LOWER($1)`,
        [testTenantKey]
      );
      if (tenantCheck.length > 0) {
        console.log(`✅ Tenant found: ${JSON.stringify(tenantCheck[0], null, 2)}`);
        console.log('\nChecking tenant admins for this tenant...');
        const adminsForTenant = await dataSource.query(
          `SELECT id, email, full_name, is_active FROM admin.tenant_admin WHERE tenant_id = $1`,
          [tenantCheck[0].id]
        );
        console.log(`Found ${adminsForTenant.length} admin(s) for this tenant:`);
        adminsForTenant.forEach((admin: any) => {
          console.log(`  - Email: "${admin.email}", Active: ${admin.is_active}`);
        });
      } else {
        console.log(`❌ Tenant "${testTenantKey}" not found`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

checkTenantAdmin();
