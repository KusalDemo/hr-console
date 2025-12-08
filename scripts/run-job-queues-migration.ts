import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

/**
 * Script to manually run the job_queues migration
 * This is a workaround if TypeORM migration detection isn't working
 */
async function runMigration() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hr_console_db',
    schema: process.env.DB_ADMIN_SCHEMA || 'admin',
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      console.log('Creating job_queues table...');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS admin.job_queues (
          id BIGSERIAL PRIMARY KEY,
          job_type VARCHAR(32) NOT NULL,
          job_name VARCHAR(255) NOT NULL,
          job_description TEXT,
          organization_id BIGINT,
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
          priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
          job_data JSONB NOT NULL,
          scheduled_at TIMESTAMPTZ,
          dependencies JSONB,
          max_retries INTEGER NOT NULL DEFAULT 3,
          retry_count INTEGER NOT NULL DEFAULT 0,
          retry_delay INTEGER NOT NULL DEFAULT 60,
          timeout INTEGER,
          is_recurring BOOLEAN NOT NULL DEFAULT false,
          cron_expression VARCHAR(128),
          next_execution_at TIMESTAMPTZ,
          last_execution_at TIMESTAMPTZ,
          job_metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_by BIGINT,
          updated_by BIGINT
        )
      `);

      console.log('Creating job_executions table...');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS admin.job_executions (
          id BIGSERIAL PRIMARY KEY,
          job_queue_id BIGINT NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'STARTED',
          started_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          duration_ms BIGINT,
          result JSONB,
          error_message TEXT,
          error_stack TEXT,
          execution_logs JSONB,
          worker_id VARCHAR(128),
          execution_metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT fk_job_executions_job_queue
            FOREIGN KEY (job_queue_id)
            REFERENCES admin.job_queues(id)
            ON DELETE CASCADE
        )
      `);

      console.log('Creating indexes...');
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_queues_type ON admin.job_queues (job_type)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_queues_status ON admin.job_queues (status)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_queues_priority ON admin.job_queues (priority)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_queues_scheduled ON admin.job_queues (scheduled_at)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_queues_organization ON admin.job_queues (organization_id)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_queues_status_scheduled ON admin.job_queues (status, scheduled_at)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_queues_recurring ON admin.job_queues (is_recurring, next_execution_at)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_executions_job ON admin.job_executions (job_queue_id)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_executions_status ON admin.job_executions (status)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_executions_started ON admin.job_executions (started_at)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_executions_completed ON admin.job_executions (completed_at)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_job_executions_job_status ON admin.job_executions (job_queue_id, status)`);

      // Record migration in migrations table
      console.log('Recording migration...');
      await queryRunner.query(`
        INSERT INTO admin.migrations (timestamp, name)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [Date.now(), 'CreateJobQueues0000000000005']);

      console.log('✅ Migration completed successfully!');
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

runMigration();
