import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Background Job Processing Migration for Admin Schema
 *
 * This migration creates:
 * - job_queues table for job definitions and status tracking in admin schema
 * - job_executions table for job execution history in admin schema
 * - Indexes for performance
 *
 * Note: This migration is designed to be run in the admin schema for system-wide jobs
 */
export class CreateJobQueues0000000000005 implements MigrationInterface {
  name = 'CreateJobQueues0000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create job_queues table in admin schema
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

    // Create job_executions table in admin schema
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

    // Create indexes for job_queues
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_type 
      ON admin.job_queues (job_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_status 
      ON admin.job_queues (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_priority 
      ON admin.job_queues (priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_scheduled 
      ON admin.job_queues (scheduled_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_organization 
      ON admin.job_queues (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_status_scheduled 
      ON admin.job_queues (status, scheduled_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_recurring 
      ON admin.job_queues (is_recurring, next_execution_at)
    `);

    // Create indexes for job_executions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_job 
      ON admin.job_executions (job_queue_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_status 
      ON admin.job_executions (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_started 
      ON admin.job_executions (started_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_completed 
      ON admin.job_executions (completed_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_job_status 
      ON admin.job_executions (job_queue_id, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for job_executions
    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_executions_job_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_executions_completed
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_executions_started
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_executions_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_executions_job
    `);

    // Drop indexes for job_queues
    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_queues_recurring
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_queues_status_scheduled
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_queues_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_queues_scheduled
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_queues_priority
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_queues_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS admin.idx_job_queues_type
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS admin.job_executions
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS admin.job_queues
    `);
  }
}
