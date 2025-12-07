import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Query Performance Service
 * 
 * Provides functionality to monitor and analyze database query performance:
 * - Index usage statistics
 * - Slow query detection
 * - Table statistics
 * - Index recommendations
 * - Query plan analysis
 */
@Injectable()
export class QueryPerformanceService {
  private readonly logger = new Logger(QueryPerformanceService.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Get index usage statistics
   * Returns information about index usage, including unused indexes
   */
  async getIndexUsageStats(): Promise<{
    indexName: string;
    tableName: string;
    indexScans: number;
    tuplesRead: number;
    tuplesFetched: number;
  }[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = current_schema()
      ORDER BY idx_scan ASC, tablename, indexname
    `;

    try {
      const result = await this.dataSource.query(query);
      return result.map((row: any) => ({
        indexName: row.indexname,
        tableName: row.tablename,
        indexScans: parseInt(row.index_scans, 10),
        tuplesRead: parseInt(row.tuples_read, 10),
        tuplesFetched: parseInt(row.tuples_fetched, 10),
      }));
    } catch (error) {
      this.logger.error('Error fetching index usage stats', error);
      throw error;
    }
  }

  /**
   * Get unused indexes (indexes that have never been scanned)
   */
  async getUnusedIndexes(): Promise<{
    tableName: string;
    indexName: string;
    indexSize: string;
  }[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = current_schema()
        AND idx_scan = 0
        AND indexrelid IS NOT NULL
      ORDER BY pg_relation_size(indexrelid) DESC
    `;

    try {
      const result = await this.dataSource.query(query);
      return result.map((row: any) => ({
        tableName: row.tablename,
        indexName: row.indexname,
        indexSize: row.index_size,
      }));
    } catch (error) {
      this.logger.error('Error fetching unused indexes', error);
      throw error;
    }
  }

  /**
   * Get table statistics
   * Returns information about table sizes, row counts, and last vacuum/analyze
   */
  async getTableStats(): Promise<{
    tableName: string;
    rowCount: number;
    tableSize: string;
    indexesSize: string;
    totalSize: string;
    lastVacuum: Date | null;
    lastAnalyze: Date | null;
  }[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                       pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables
      WHERE schemaname = current_schema()
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    try {
      const result = await this.dataSource.query(query);
      return result.map((row: any) => ({
        tableName: row.tablename,
        rowCount: parseInt(row.row_count, 10),
        tableSize: row.table_size,
        indexesSize: row.indexes_size,
        totalSize: row.total_size,
        lastVacuum: row.last_vacuum ? new Date(row.last_vacuum) : null,
        lastAnalyze: row.last_analyze ? new Date(row.last_analyze) : null,
      }));
    } catch (error) {
      this.logger.error('Error fetching table stats', error);
      throw error;
    }
  }

  /**
   * Get slow queries from pg_stat_statements
   * Note: Requires pg_stat_statements extension to be enabled
   */
  async getSlowQueries(limit: number = 20): Promise<{
    query: string;
    calls: number;
    totalTime: number;
    meanTime: number;
    minTime: number;
    maxTime: number;
  }[]> {
    const query = `
      SELECT
        query,
        calls,
        total_exec_time as total_time,
        mean_exec_time as mean_time,
        min_exec_time as min_time,
        max_exec_time as max_time
      FROM pg_stat_statements
      WHERE schemaname = current_schema()
        OR schemaname IS NULL
      ORDER BY mean_exec_time DESC
      LIMIT $1
    `;

    try {
      const result = await this.dataSource.query(query, [limit]);
      return result.map((row: any) => ({
        query: row.query.substring(0, 200), // Truncate long queries
        calls: parseInt(row.calls, 10),
        totalTime: parseFloat(row.total_time),
        meanTime: parseFloat(row.mean_time),
        minTime: parseFloat(row.min_time),
        maxTime: parseFloat(row.max_time),
      }));
    } catch (error) {
      this.logger.warn(
        'Error fetching slow queries. pg_stat_statements may not be enabled.',
        error,
      );
      return [];
    }
  }

  /**
   * Analyze query execution plan
   * Returns the execution plan for a given query
   */
  async analyzeQueryPlan(sql: string, params: any[] = []): Promise<{
    plan: string;
    executionTime: number;
  }> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${sql}`;

    try {
      const startTime = Date.now();
      const result = await this.dataSource.query(explainQuery, params);
      const executionTime = Date.now() - startTime;

      return {
        plan: JSON.stringify(result, null, 2),
        executionTime,
      };
    } catch (error) {
      this.logger.error('Error analyzing query plan', error);
      throw error;
    }
  }

  /**
   * Get index recommendations based on missing indexes
   * Analyzes sequential scans that could benefit from indexes
   */
  async getIndexRecommendations(): Promise<{
    tableName: string;
    columnName: string;
    sequentialScans: number;
    recommendation: string;
  }[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        attname as column_name,
        seq_scan,
        seq_tup_read,
        CASE
          WHEN seq_scan > 100 THEN 'Consider adding index on ' || attname
          ELSE 'Low priority: ' || attname
        END as recommendation
      FROM pg_stat_user_tables t
      JOIN pg_attribute a ON a.attrelid = t.relid
      WHERE schemaname = current_schema()
        AND seq_scan > 10
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY seq_scan DESC
      LIMIT 50
    `;

    try {
      const result = await this.dataSource.query(query);
      return result.map((row: any) => ({
        tableName: row.tablename,
        columnName: row.column_name,
        sequentialScans: parseInt(row.seq_scan, 10),
        recommendation: row.recommendation,
      }));
    } catch (error) {
      this.logger.error('Error fetching index recommendations', error);
      throw error;
    }
  }

  /**
   * Get table bloat information
   * Identifies tables that may need VACUUM
   */
  async getTableBloat(): Promise<{
    tableName: string;
    tableSize: string;
    bloatSize: string;
    bloatPercent: number;
  }[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(
          (pg_total_relation_size(schemaname||'.'||tablename) - 
           pg_relation_size(schemaname||'.'||tablename)) * 
          (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0))
        ) as bloat_size,
        CASE
          WHEN n_live_tup + n_dead_tup > 0 THEN
            ROUND((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2)
          ELSE 0
        END as bloat_percent
      FROM pg_stat_user_tables
      WHERE schemaname = current_schema()
        AND n_dead_tup > 0
      ORDER BY (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) DESC
    `;

    try {
      const result = await this.dataSource.query(query);
      return result.map((row: any) => ({
        tableName: row.tablename,
        tableSize: row.table_size,
        bloatSize: row.bloat_size || '0 bytes',
        bloatPercent: parseFloat(row.bloat_percent) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching table bloat', error);
      throw error;
    }
  }

  /**
   * Get index size information
   * Returns size of all indexes
   */
  async getIndexSizes(): Promise<{
    tableName: string;
    indexName: string;
    indexSize: string;
    indexSizeBytes: number;
  }[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_relation_size(indexrelid) as index_size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = current_schema()
      ORDER BY pg_relation_size(indexrelid) DESC
    `;

    try {
      const result = await this.dataSource.query(query);
      return result.map((row: any) => ({
        tableName: row.tablename,
        indexName: row.indexname,
        indexSize: row.index_size,
        indexSizeBytes: parseInt(row.index_size_bytes, 10),
      }));
    } catch (error) {
      this.logger.error('Error fetching index sizes', error);
      throw error;
    }
  }

  /**
   * Get database connection statistics
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
  }> {
    const queries = [
      `SELECT count(*) as total FROM pg_stat_activity WHERE datname = current_database()`,
      `SELECT count(*) as active FROM pg_stat_activity WHERE datname = current_database() AND state = 'active'`,
      `SELECT count(*) as idle FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle'`,
      `SELECT setting::int as max_connections FROM pg_settings WHERE name = 'max_connections'`,
    ];

    try {
      const [totalResult, activeResult, idleResult, maxResult] =
        await Promise.all(
          queries.map((q) => this.dataSource.query(q)),
        );

      return {
        totalConnections: parseInt(totalResult[0].total, 10),
        activeConnections: parseInt(activeResult[0].active, 10),
        idleConnections: parseInt(idleResult[0].idle, 10),
        maxConnections: parseInt(maxResult[0].max_connections, 10),
      };
    } catch (error) {
      this.logger.error('Error fetching connection stats', error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(): Promise<{
    tableStats: any[];
    indexUsage: any[];
    unusedIndexes: any[];
    slowQueries: any[];
    indexRecommendations: any[];
    tableBloat: any[];
    connectionStats: any;
  }> {
    try {
      const [
        tableStats,
        indexUsage,
        unusedIndexes,
        slowQueries,
        indexRecommendations,
        tableBloat,
        connectionStats,
      ] = await Promise.all([
        this.getTableStats(),
        this.getIndexUsageStats(),
        this.getUnusedIndexes(),
        this.getSlowQueries(10),
        this.getIndexRecommendations(),
        this.getTableBloat(),
        this.getConnectionStats(),
      ]);

      return {
        tableStats,
        indexUsage,
        unusedIndexes,
        slowQueries,
        indexRecommendations,
        tableBloat,
        connectionStats,
      };
    } catch (error) {
      this.logger.error('Error generating performance report', error);
      throw error;
    }
  }

  /**
   * Vacuum a specific table
   */
  async vacuumTable(tableName: string, analyze: boolean = true): Promise<void> {
    const command = analyze ? 'VACUUM ANALYZE' : 'VACUUM';
    const query = `${command} ${tableName}`;

    try {
      await this.dataSource.query(query);
      this.logger.log(`Successfully vacuumed table: ${tableName}`);
    } catch (error) {
      this.logger.error(`Error vacuuming table ${tableName}`, error);
      throw error;
    }
  }

  /**
   * Reindex a specific index
   */
  async reindexIndex(indexName: string): Promise<void> {
    const query = `REINDEX INDEX ${indexName}`;

    try {
      await this.dataSource.query(query);
      this.logger.log(`Successfully reindexed: ${indexName}`);
    } catch (error) {
      this.logger.error(`Error reindexing ${indexName}`, error);
      throw error;
    }
  }
}
