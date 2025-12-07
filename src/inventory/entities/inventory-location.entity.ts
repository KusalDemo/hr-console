import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

/**
 * Inventory Location Entity
 *
 * Multi-location inventory support with warehouse, bin tracking.
 */
@Entity('inventory_locations')
@Index('idx_inventory_locations_organization', ['organizationId'])
@Index('idx_inventory_locations_parent', ['parentLocationId'])
@Index('idx_inventory_locations_active', ['isActive'])
export class InventoryLocation {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Location name
   */
  @Column({ name: 'location_name', type: 'varchar', length: 255, nullable: false })
  locationName: string;

  /**
   * Location code (e.g., "WH-001", "BIN-A1")
   */
  @Column({ name: 'location_code', type: 'varchar', length: 64, nullable: true })
  locationCode: string | null;

  /**
   * Location description
   */
  @Column({ name: 'location_description', type: 'text', nullable: true })
  locationDescription: string | null;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Parent location ID (for hierarchical locations: warehouse -> aisle -> bin)
   */
  @Column({ name: 'parent_location_id', type: 'bigint', nullable: true })
  parentLocationId: number | null;

  /**
   * Location type (WAREHOUSE, AISLE, SHELF, BIN, etc.)
   */
  @Column({ name: 'location_type', type: 'varchar', length: 64, nullable: true })
  locationType: string | null;

  /**
   * Address/address details
   */
  @Column({ name: 'address', type: 'text', nullable: true })
  address: string | null;

  /**
   * Whether location is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Location metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'location_metadata', type: 'jsonb', nullable: true })
  locationMetadata: Record<string, any> | null;

  /**
   * Inventory items at this location
   */
  @OneToMany(() => InventoryItem, (item) => item.location, {
    cascade: false,
    lazy: true,
  })
  items: Promise<InventoryItem[]> | InventoryItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
