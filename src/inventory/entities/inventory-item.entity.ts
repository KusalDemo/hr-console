import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { InventoryLocation } from './inventory-location.entity';
import { InventoryTransaction } from './inventory-transaction.entity';

/**
 * Item Type Enum
 */
export enum ItemType {
  PRODUCT = 'PRODUCT', // Standard product
  RAW_MATERIAL = 'RAW_MATERIAL', // Raw material
  COMPONENT = 'COMPONENT', // Component
  BUNDLE = 'BUNDLE', // Bundle/kit
  ASSEMBLY = 'ASSEMBLY', // Assembled item
  SERVICE = 'SERVICE', // Service item
}

/**
 * Item Status Enum
 */
export enum ItemStatus {
  ACTIVE = 'ACTIVE', // Active item
  INACTIVE = 'INACTIVE', // Inactive item
  DISCONTINUED = 'DISCONTINUED', // Discontinued
}

/**
 * Inventory Item Entity
 *
 * Inventory items with SKU, categories, stock levels, locations, and valuation.
 */
@Entity('inventory_items')
@Index('idx_inventory_items_sku', ['sku'])
@Index('idx_inventory_items_category', ['category'])
@Index('idx_inventory_items_location', ['locationId'])
@Index('idx_inventory_items_status', ['itemStatus'])
@Index('idx_inventory_items_organization', ['organizationId'])
@Index('idx_inventory_items_type', ['itemType'])
export class InventoryItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * SKU (Stock Keeping Unit) - unique identifier
   */
  @Column({ name: 'sku', type: 'varchar', length: 128, unique: true, nullable: false })
  sku: string;

  /**
   * Item name
   */
  @Column({ name: 'item_name', type: 'varchar', length: 255, nullable: false })
  itemName: string;

  /**
   * Item description
   */
  @Column({ name: 'item_description', type: 'text', nullable: true })
  itemDescription: string | null;

  /**
   * Item type
   */
  @Column({
    name: 'item_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ItemType.PRODUCT,
  })
  itemType: ItemType;

  /**
   * Item category
   */
  @Column({ name: 'category', type: 'varchar', length: 128, nullable: true })
  category: string | null;

  /**
   * Item status
   */
  @Column({
    name: 'item_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ItemStatus.ACTIVE,
  })
  itemStatus: ItemStatus;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Primary location ID
   */
  @Column({ name: 'location_id', type: 'bigint', nullable: true })
  locationId: number | null;

  /**
   * Location relationship
   */
  @ManyToOne(() => InventoryLocation, (location) => location.items, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'location_id' })
  location: InventoryLocation | null;

  /**
   * Current stock quantity
   */
  @Column({
    name: 'stock_quantity',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  stockQuantity: number;

  /**
   * Reserved quantity (allocated but not yet shipped)
   */
  @Column({
    name: 'reserved_quantity',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  reservedQuantity: number;

  /**
   * Available quantity (stock - reserved)
   */
  @Column({
    name: 'available_quantity',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  availableQuantity: number;

  /**
   * Reorder point (minimum stock level before reordering)
   */
  @Column({ name: 'reorder_point', type: 'decimal', precision: 15, scale: 2, nullable: true })
  reorderPoint: number | null;

  /**
   * Reorder quantity (quantity to order when reorder point is reached)
   */
  @Column({ name: 'reorder_quantity', type: 'decimal', precision: 15, scale: 2, nullable: true })
  reorderQuantity: number | null;

  /**
   * Maximum stock level
   */
  @Column({ name: 'max_stock_level', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxStockLevel: number | null;

  /**
   * Unit of measure (e.g., "pcs", "kg", "liters", "boxes")
   */
  @Column({ name: 'unit_of_measure', type: 'varchar', length: 32, nullable: true, default: 'pcs' })
  unitOfMeasure: string | null;

  /**
   * Cost per unit (for valuation)
   */
  @Column({ name: 'cost_per_unit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  costPerUnit: number | null;

  /**
   * Valuation method (FIFO, LIFO, AVERAGE)
   */
  @Column({
    name: 'valuation_method',
    type: 'varchar',
    length: 32,
    nullable: true,
    default: 'AVERAGE',
  })
  valuationMethod: string | null;

  /**
   * Whether item tracks serial numbers
   */
  @Column({ name: 'track_serial_numbers', type: 'boolean', nullable: false, default: false })
  trackSerialNumbers: boolean;

  /**
   * Whether item tracks lot/batch numbers
   */
  @Column({ name: 'track_lot_numbers', type: 'boolean', nullable: false, default: false })
  trackLotNumbers: boolean;

  /**
   * Parent item ID (for variants/bundles)
   */
  @Column({ name: 'parent_item_id', type: 'bigint', nullable: true })
  parentItemId: number | null;

  /**
   * Bundle components (JSON: array of {itemId, quantity} for bundles)
   */
  @Column({ name: 'bundle_components', type: 'jsonb', nullable: true })
  bundleComponents: Array<{ itemId: number; quantity: number }> | null;

  /**
   * Item metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'item_metadata', type: 'jsonb', nullable: true })
  itemMetadata: Record<string, any> | null;

  /**
   * Inventory transactions
   */
  @OneToMany(() => InventoryTransaction, (transaction) => transaction.item, {
    cascade: false,
    lazy: true,
  })
  transactions: Promise<InventoryTransaction[]> | InventoryTransaction[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
