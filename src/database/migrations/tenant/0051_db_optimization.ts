import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Database Optimization & Indexing Migration
 *
 * This migration adds strategic indexes for performance optimization:
 * - Composite indexes for common query patterns
 * - Covering indexes for frequently selected columns
 * - Partial indexes for filtered queries
 * - Indexes for foreign keys that are frequently queried
 * - Optimization for high-volume tables (time_entries, audit_logs)
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class DbOptimization0000000000051 implements MigrationInterface {
  name = 'DbOptimization0000000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // TIME ENTRIES - High volume table, add composite indexes for common queries
    // ============================================================================

    // Composite index for employee time entries with date range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date 
      ON time_entries (employee_id, start_time DESC) 
      WHERE is_locked = false
    `);

    // Composite index for project time tracking
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_project_date 
      ON time_entries (project_id, start_time DESC) 
      WHERE project_id IS NOT NULL
    `);

    // Composite index for status and date filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_status_date 
      ON time_entries (status, start_time DESC) 
      WHERE status IN ('DRAFT', 'SUBMITTED', 'APPROVED')
    `);

    // Composite index for organization and date range
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_org_date 
      ON time_entries (organization_id, start_time DESC) 
      WHERE organization_id IS NOT NULL
    `);

    // Composite index for billable time queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_billable_date 
      ON time_entries (is_billable, start_time DESC) 
      WHERE is_billable = true
    `);

    // Covering index for time entry reports (includes commonly selected columns)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_covering 
      ON time_entries (employee_id, start_time DESC) 
      INCLUDE (hours, is_billable, billing_amount, project_id, task_id)
    `);

    // Composite index for task time tracking
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_task_date 
      ON time_entries (task_id, start_time DESC) 
      WHERE task_id IS NOT NULL
    `);

    // ============================================================================
    // AUDIT LOGS - High volume audit table, optimize for time-based queries
    // ============================================================================

    // Composite index for actor and activity type queries (already exists but ensure it's optimal)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type_created 
      ON audit_logs (actor_type, actor_id, created_at DESC)
    `);

    // Composite index for target entity queries (already exists but ensure it's optimal)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created 
      ON audit_logs (target_type, target_id, created_at DESC) 
      WHERE target_type IS NOT NULL
    `);

    // Composite index for activity type and date range
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_type_date 
      ON audit_logs (activity_type, created_at DESC)
    `);

    // Composite index for organization and date range
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date 
      ON audit_logs (organization_id, created_at DESC) 
      WHERE organization_id IS NOT NULL
    `);

    // Index for archived logs cleanup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_archived_retention 
      ON audit_logs (is_archived, retention_until) 
      WHERE is_archived = false AND retention_until IS NOT NULL
    `);

    // Composite index for audit level and date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_level_date 
      ON audit_logs (audit_level, created_at DESC)
    `);

    // ============================================================================
    // EMPLOYEES - Optimize common employee queries
    // ============================================================================

    // Composite index for department and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_dept_status 
      ON employees (department_id, employment_status) 
      WHERE department_id IS NOT NULL
    `);

    // Composite index for manager and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_manager_status 
      ON employees (manager_id, employment_status) 
      WHERE manager_id IS NOT NULL
    `);

    // Index for employee type and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_type_status 
      ON employees (employee_type, employment_status)
    `);

    // Composite index for organization and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_org_status 
      ON employees (organization_id, employment_status, is_active)
    `);

    // Composite index for active employees in organization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_org_active 
      ON employees (organization_id, is_active) 
      WHERE is_active = true
    `);

    // ============================================================================
    // PROJECTS - Optimize project queries
    // ============================================================================

    // Composite index for organization and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_org_status 
      ON projects (organization_id, project_status) 
      WHERE organization_id IS NOT NULL
    `);

    // Composite index for project manager and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_manager_status 
      ON projects (project_manager_id, project_status) 
      WHERE project_manager_id IS NOT NULL
    `);

    // Composite index for client and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_client_status 
      ON projects (client_id, project_status) 
      WHERE client_id IS NOT NULL
    `);

    // Composite index for dates and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_dates_status 
      ON projects (start_date, end_date, project_status)
    `);

    // ============================================================================
    // TASKS - Optimize task queries
    // ============================================================================

    // Composite index for project and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
      ON tasks (project_id, task_status) 
      WHERE project_id IS NOT NULL
    `);

    // Composite index for assignee and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status 
      ON tasks (assignee_id, task_status) 
      WHERE assignee_id IS NOT NULL
    `);

    // Composite index for due date and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_due_status 
      ON tasks (due_date, task_status) 
      WHERE due_date IS NOT NULL
    `);

    // Composite index for parent task hierarchy
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_parent 
      ON tasks (parent_task_id, task_status) 
      WHERE parent_task_id IS NOT NULL
    `);

    // Composite index for priority and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_priority_status 
      ON tasks (priority, task_status, due_date)
    `);

    // ============================================================================
    // JOB QUEUE - Optimize job processing queries
    // ============================================================================

    // Composite index for pending jobs with priority ordering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_pending_priority 
      ON job_queues (status, priority DESC, scheduled_at) 
      WHERE status = 'PENDING'
    `);

    // Composite index for scheduled jobs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_scheduled 
      ON job_queues (status, scheduled_at) 
      WHERE status = 'PENDING' AND scheduled_at IS NOT NULL
    `);

    // Composite index for recurring jobs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_queues_recurring_next 
      ON job_queues (is_recurring, next_execution_at) 
      WHERE is_recurring = true AND next_execution_at IS NOT NULL
    `);

    // Composite index for job executions by job and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_job_status 
      ON job_executions (job_queue_id, status, started_at DESC)
    `);

    // ============================================================================
    // TIMESHEETS - Optimize timesheet queries
    // ============================================================================

    // Composite index for employee and period
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_employee_period 
      ON timesheets (employee_id, period_start_date DESC, status)
    `);

    // Composite index for status and dates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_status_dates 
      ON timesheets (status, period_start_date DESC)
    `);

    // Composite index for organization and period
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_org_period 
      ON timesheets (organization_id, period_start_date DESC) 
      WHERE organization_id IS NOT NULL
    `);

    // ============================================================================
    // LEAVE REQUESTS - Optimize leave management queries
    // ============================================================================

    // Composite index for employee and date range
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates 
      ON leave_requests (employee_id, start_date, end_date)
    `);

    // Composite index for status and dates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status_dates 
      ON leave_requests (status, start_date DESC)
    `);

    // Composite index for approver and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_approver_status 
      ON leave_requests (approver_id, status) 
      WHERE approver_id IS NOT NULL
    `);

    // ============================================================================
    // GOALS - Optimize goal queries
    // ============================================================================

    // Composite index for employee and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_employee_status 
      ON goals (employee_id, goal_status) 
      WHERE employee_id IS NOT NULL
    `);

    // Composite index for organization and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_org_status 
      ON goals (organization_id, goal_status) 
      WHERE organization_id IS NOT NULL
    `);

    // Composite index for parent goal hierarchy
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_parent 
      ON goals (parent_goal_id, goal_status) 
      WHERE parent_goal_id IS NOT NULL
    `);

    // ============================================================================
    // PERFORMANCE REVIEWS - Optimize review queries
    // ============================================================================

    // Composite index for employee and cycle
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_cycle 
      ON performance_reviews (employee_id, review_cycle_id)
    `);

    // Composite index for status and dates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_status_dates 
      ON performance_reviews (review_status, review_period_start DESC)
    `);

    // ============================================================================
    // CONTACTS - Optimize contact queries
    // ============================================================================

    // Composite index for contact type and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_type_status 
      ON contacts (contact_type, contact_status, is_active)
    `);

    // Composite index for organization and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_org_status 
      ON contacts (organization_id, contact_status) 
      WHERE organization_id IS NOT NULL
    `);

    // ============================================================================
    // CALENDAR EVENTS - Optimize calendar queries
    // ============================================================================

    // Composite index for calendar and date range
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_dates 
      ON calendar_events (calendar_id, start_time, end_time)
    `);

    // Composite index for organizer and dates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer_dates 
      ON calendar_events (organizer_id, start_time DESC) 
      WHERE organizer_id IS NOT NULL
    `);

    // ============================================================================
    // SUPPORT TICKETS - Optimize ticket queries
    // ============================================================================

    // Composite index for status and priority
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority 
      ON support_tickets (ticket_status, priority, created_at DESC)
    `);

    // Composite index for assignee and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee_status 
      ON support_tickets (assigned_to_id, ticket_status) 
      WHERE assigned_to_id IS NOT NULL
    `);

    // Composite index for customer and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_status 
      ON support_tickets (customer_id, ticket_status) 
      WHERE customer_id IS NOT NULL
    `);

    // ============================================================================
    // FINANCIAL TRANSACTIONS - Optimize financial queries
    // ============================================================================

    // Composite index for account and date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_account_date 
      ON financial_transactions (account_id, transaction_date DESC)
    `);

    // Composite index for transaction type and date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_date 
      ON financial_transactions (transaction_type, transaction_date DESC)
    `);

    // ============================================================================
    // INVOICES - Optimize invoice queries
    // ============================================================================

    // Composite index for client and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_client_status 
      ON invoices (client_id, invoice_status) 
      WHERE client_id IS NOT NULL
    `);

    // Composite index for due date and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_due_status 
      ON invoices (due_date, invoice_status) 
      WHERE due_date IS NOT NULL
    `);

    // ============================================================================
    // NOTIFICATIONS - Optimize notification queries
    // ============================================================================

    // Composite index for recipient and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status 
      ON notifications (recipient_id, notification_status, created_at DESC)
    `);

    // Composite index for unread notifications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_unread 
      ON notifications (recipient_id, created_at DESC) 
      WHERE notification_status = 'UNREAD'
    `);

    // ============================================================================
    // WEBHOOK EVENTS - Optimize webhook queries
    // ============================================================================

    // Composite index for subscription and status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription_status 
      ON webhook_events (webhook_subscription_id, delivery_status, created_at DESC)
    `);

    // Composite index for retry attempts
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_retry 
      ON webhook_events (delivery_status, retry_count, next_retry_at) 
      WHERE delivery_status = 'FAILED' AND retry_count < max_retries
    `);

    // ============================================================================
    // STATISTICS UPDATES - Ensure query planner has up-to-date statistics
    // ============================================================================

    // Update statistics for key tables
    await queryRunner.query(`ANALYZE time_entries`);
    await queryRunner.query(`ANALYZE audit_logs`);
    await queryRunner.query(`ANALYZE employees`);
    await queryRunner.query(`ANALYZE projects`);
    await queryRunner.query(`ANALYZE tasks`);
    await queryRunner.query(`ANALYZE job_queues`);
    await queryRunner.query(`ANALYZE job_executions`);
    await queryRunner.query(`ANALYZE timesheets`);
    await queryRunner.query(`ANALYZE leave_requests`);
    await queryRunner.query(`ANALYZE goals`);
    await queryRunner.query(`ANALYZE performance_reviews`);
    await queryRunner.query(`ANALYZE contacts`);
    await queryRunner.query(`ANALYZE calendar_events`);
    await queryRunner.query(`ANALYZE support_tickets`);
    await queryRunner.query(`ANALYZE financial_transactions`);
    await queryRunner.query(`ANALYZE invoices`);
    await queryRunner.query(`ANALYZE notifications`);
    await queryRunner.query(`ANALYZE webhook_events`);

    // ============================================================================
    // INDEX COMMENTS - Document index purposes
    // ============================================================================

    await queryRunner.query(`
      COMMENT ON INDEX idx_time_entries_employee_date IS 
      'Optimized for employee time entry queries with date filtering and unlocked entries'
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_audit_logs_actor_type_created IS 
      'Optimized for actor-based audit queries with time ordering'
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_job_queues_pending_priority IS 
      'Optimized for job queue processing with priority ordering'
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_employees_dept_status IS 
      'Optimized for department-based employee queries with status filtering'
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_projects_org_status IS 
      'Optimized for organization-based project queries with status filtering'
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_tasks_project_status IS 
      'Optimized for project-based task queries with status filtering'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    // Note: We drop all indexes created in this migration
    // Some indexes may have been created in other migrations, so we use IF EXISTS

    // Webhook events indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_retry
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_subscription_status
    `);

    // Notifications indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_unread
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_recipient_status
    `);

    // Invoices indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_invoices_due_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_invoices_client_status
    `);

    // Financial transactions indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_financial_transactions_type_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_financial_transactions_account_date
    `);

    // Support tickets indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_support_tickets_customer_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_support_tickets_assignee_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_support_tickets_status_priority
    `);

    // Calendar events indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_calendar_events_organizer_dates
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_calendar_events_calendar_dates
    `);

    // Contacts indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_contacts_org_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_contacts_type_status
    `);

    // Performance reviews indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_status_dates
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_employee_cycle
    `);

    // Goals indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_parent
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_org_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_employee_status
    `);

    // Leave requests indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_leave_requests_approver_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_leave_requests_status_dates
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_leave_requests_employee_dates
    `);

    // Timesheets indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_timesheets_org_period
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_timesheets_status_dates
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_timesheets_employee_period
    `);

    // Job executions indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_job_executions_job_status
    `);

    // Job queues indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_job_queues_recurring_next
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_job_queues_scheduled
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_job_queues_pending_priority
    `);

    // Tasks indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_priority_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_parent
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_due_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_assignee_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_project_status
    `);

    // Projects indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_dates_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_client_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_manager_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_org_status
    `);

    // Employees indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employees_org_active
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employees_org_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employees_type_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employees_manager_status
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employees_dept_status
    `);

    // Audit logs indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_logs_level_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_logs_archived_retention
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_logs_org_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_logs_type_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_logs_target_created
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_logs_actor_type_created
    `);

    // Time entries indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_time_entries_task_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_time_entries_covering
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_time_entries_billable_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_time_entries_org_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_time_entries_status_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_time_entries_project_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_time_entries_employee_date
    `);
  }
}


