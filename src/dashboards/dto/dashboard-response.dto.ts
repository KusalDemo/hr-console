import { DashboardType, DashboardLayoutType } from '../entities/dashboard.entity';

/**
 * Dashboard Response DTO
 */
export class DashboardResponseDto {
  id: number;
  dashboardName: string;
  dashboardDescription: string | null;
  organizationId: number;
  dashboardType: DashboardType;
  ownerId: number | null;
  departmentId: number | null;
  teamId: number | null;
  layoutType: DashboardLayoutType;
  layoutConfig: Record<string, any> | null;
  widgetConfigs: Record<string, any>[] | null;
  isShared: boolean;
  isTemplate: boolean;
  templateId: number | null;
  isActive: boolean;
  category: string | null;
  tags: string[] | null;
  sharingConfig: Record<string, any> | null;
  dashboardMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
  widgetCount?: number;
}
