import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hr_console_db',
    schema: process.env.DB_ADMIN_SCHEMA || 'admin',
    // Connection pool settings
    extra: {
      max: 10, // Maximum number of connections in the pool
      min: 2, // Minimum number of connections in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    },
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'schema'] : ['error'],
    // Auto-load entities (will be configured per module)
    autoLoadEntities: true,
    // Synchronize should be false in production (use migrations)
    synchronize: process.env.NODE_ENV === 'development' ? false : false,
    // Migration configuration
    migrations: ['dist/database/migrations/**/*.js'],
    migrationsTableName: 'migrations',
    migrationsRun: false, // Run migrations manually or via CLI
    // SSL configuration (for production)
    ssl:
      process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  }),
);
