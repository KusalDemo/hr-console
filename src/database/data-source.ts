import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

/**
 * Data source configuration for TypeORM migrations
 * This is used by the TypeORM CLI for running migrations
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'hr_console_db',
  schema: process.env.DB_ADMIN_SCHEMA || 'admin',
  entities: [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations', '**', '*.{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'schema'] : ['error'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

