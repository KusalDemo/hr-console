import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TenantAdmin } from './tenant-admin.entity';

/**
 * Tenant Entity - Represents a tenant in the admin schema
 *
 * Tenants are isolated workspaces with their own schema (t_{tenantKey})
 * Each tenant can have multiple organizations and users
 * Tenants are linked to subscriptions for billing and access control
 */
@Entity('tenants', { schema: 'admin' })
@Index('idx_tenants_active', ['isActive'])
@Index('idx_tenants_key', ['tenantKey'])
export class Tenant {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'tenant_key', type: 'varchar', length: 64, unique: true, nullable: false })
  tenantKey: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Tenant administrators for this tenant
   * One tenant can have multiple tenant admins
   */
  @OneToMany(() => TenantAdmin, (tenantAdmin) => tenantAdmin.tenant, {
    cascade: false,
    lazy: true,
  })
  tenantAdmins: Promise<TenantAdmin[]>;

  /**
   * Subscriptions for this tenant
   * One tenant can have multiple subscriptions (historical tracking)
   * Using forward reference to avoid circular dependency
   */
  @OneToMany(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Subscription } = require('../../subscriptions/entities/subscription.entity');
      return Subscription;
    },
    (subscription: any) => subscription.tenant,
    {
      cascade: false,
      lazy: true,
    },
  )
  subscriptions: Promise<any[]>;

  /**
   * Check if tenant is active and can be accessed
   */
  isAccessible(): boolean {
    return this.isActive;
  }

  /**
   * Get the schema name for this tenant
   * Schema format: t_{tenantKey}
   */
  getSchemaName(): string {
    return `t_${this.tenantKey}`;
  }
}
