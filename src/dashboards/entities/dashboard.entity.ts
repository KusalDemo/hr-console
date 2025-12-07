import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DashboardWidget } from './dashboard-widget.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Dashboard Type Enum
 */
export enum DashboardType {
  PERSONAL = 'PERSONAL', // Personal dashboard
  TEAM = 'TEAM', // Team dashboard
  DEPARTMENT = 'DEPARTMENT', // Department dashboard
  ORGANIZATION = 'ORGANIZATION', // Organization dashboard
  SHARED = 'SHARED', // Shared dashboard
}

/**
 * Dashboard Layout Type Enum
 */
export enum DashboardLayoutType {
  GRID = 'GRID', // Grid layout
  FLEX = 'FLEX', // Flex layout
  CUSTOM = 'CUSTOM', // Custom layout
}

/**
 * Dashboard Entity
 *
 * Configurable dashboards with:
 * - Layout and widget configurations
 * - Drag-drop layouts
 * - Widget types (charts, tables, KPIs, lists)
 * - Dashboard sharing, templates
 * - Personal/custom dashboards
 * - Integration with KPI framework for widget data
 */
@Entity('dashboards')
@Index('idx_dashboards_organization', ['organizationId'])
@Index('idx_dashboards_owner', ['ownerId'])
@Index('idx_dashboards_type', ['dashboardType'])
@Index('idx_dashboards_shared', ['isShared'])
@Index('idx_dashboards_template', ['isTemplate'])
@Index('idx_dashboards_active', ['isActive'])
export class Dashboard {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Dashboard name
   */
  @Column({ name: 'dashboard_name', type: 'varchar', length: 255, nullable: false })
  dashboardName: string;

  /**
   * Dashboard description
   */
  @Column({ name: 'dashboard_description', type: 'text', nullable: true })
  dashboardDescription: string | null;

  /**
   * Organization ID
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Dashboard type
   */
  @Column({
    name: 'dashboard_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: DashboardType.PERSONAL,
  })
  dashboardType: DashboardType;

  /**
   * Owner user ID (for personal dashboards)
   */
  @Column({ name: 'owner_id', type: 'bigint', nullable: true })
  ownerId: number | null;

  /**
   * Department ID (for department dashboards)
   */
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Team ID (for team dashboards)
   */
  @Column({ name: 'team_id', type: 'bigint', nullable: true })
  teamId: number | null;

  /**
   * Layout type
   */
  @Column({
    name: 'layout_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: DashboardLayoutType.GRID,
  })
  layoutType: DashboardLayoutType;

  /**
   * Layout configuration (JSON: grid columns, widget positions, sizes)
   */
  @Column({ name: 'layout_config', type: 'jsonb', nullable: true })
  layoutConfig: Record<string, any> | null;

  /**
   * Widget configurations (JSON array of widget instances)
   */
  @Column({ name: 'widget_configs', type: 'jsonb', nullable: true })
  widgetConfigs: Record<string, any>[] | null;

  /**
   * Whether dashboard is shared
   */
  @Column({ name: 'is_shared', type: 'boolean', nullable: false, default: false })
  isShared: boolean;

  /**
   * Whether dashboard is a template
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Template ID (if cloned from template)
   */
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Whether dashboard is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Dashboard category/tags
   */
  @Column({ name: 'category', type: 'varchar', length: 128, nullable: true })
  category: string | null;

  /**
   * Dashboard tags (JSON array)
   */
  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: string[] | null;

  /**
   * Sharing configuration (JSON: permissions, allowed users/roles)
   */
  @Column({ name: 'sharing_config', type: 'jsonb', nullable: true })
  sharingConfig: Record<string, any> | null;

  /**
   * Dashboard metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'dashboard_metadata', type: 'jsonb', nullable: true })
  dashboardMetadata: Record<string, any> | null;

  /**
   * Dashboard widgets
   */
  @OneToMany(() => DashboardWidget, (widget) => widget.dashboard, {
    cascade: true,
    lazy: true,
  })
  widgets: Promise<DashboardWidget[]> | DashboardWidget[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
