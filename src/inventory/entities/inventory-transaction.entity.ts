import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { InventoryLocation } from './inventory-location.entity';

/**
 * Transaction Type Enum
 */
export enum TransactionType {
  RECEIPT = 'RECEIPT', // Stock received/in
  ISSUE = 'ISSUE', // Stock issued/out
  TRANSFER = 'TRANSFER', // Stock transfer between locations
  ADJUSTMENT = 'ADJUSTMENT', // Stock adjustment (correction)
  RETURN = 'RETURN', // Stock return
  ASSEMBLY = 'ASSEMBLY', // Assembly (components -> finished good)
  DISASSEMBLY = 'DISASSEMBLY', // Disassembly (finished good -> components)
  WRITE_OFF = 'WRITE_OFF', // Write-off (damaged, expired, etc.)
}

/**
 * Transaction Status Enum
 */
export enum TransactionStatus {
  PENDING = 'PENDING', // Pending
  COMPLETED = 'COMPLETED', // Completed
  CANCELLED = 'CANCELLED', // Cancelled
}

/**
 * Inventory Transaction Entity
 *
 * Stock movements (in, out, transfer, adjustment) with tracking.
 */
@Entity('inventory_transactions')
@Index('idx_inventory_transactions_item', ['itemId'])
@Index('idx_inventory_transactions_type', ['transactionType'])
@Index('idx_inventory_transactions_status', ['transactionStatus'])
@Index('idx_inventory_transactions_date', ['transactionDate'])
@Index('idx_inventory_transactions_location', ['locationId'])
@Index('idx_inventory_transactions_reference', ['referenceNumber'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to inventory item
   */
  @Column({ name: 'item_id', type: 'bigint', nullable: false })
  itemId: number;

  /**
   * Item relationship
   */
  @ManyToOne(() => InventoryItem, (item) => item.transactions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  /**
   * Transaction type
   */
  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  transactionType: TransactionType;

  /**
   * Transaction status
   */
  @Column({
    name: 'transaction_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TransactionStatus.PENDING,
  })
  transactionStatus: TransactionStatus;

  /**
   * Transaction date
   */
  @Column({ name: 'transaction_date', type: 'date', nullable: false })
  transactionDate: Date;

  /**
   * Quantity (positive for receipts, negative for issues)
   */
  @Column({ name: 'quantity', type: 'decimal', precision: 15, scale: 2, nullable: false })
  quantity: number;

  /**
   * Unit cost (for valuation)
   */
  @Column({ name: 'unit_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitCost: number | null;

  /**
   * Total cost (quantity * unit_cost)
   */
  @Column({ name: 'total_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalCost: number | null;

  /**
   * Location ID (from location for transfers)
   */
  @Column({ name: 'location_id', type: 'bigint', nullable: true })
  locationId: number | null;

  /**
   * Location relationship
   */
  @ManyToOne(() => InventoryLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location: InventoryLocation | null;

  /**
   * To location ID (for transfers)
   */
  @Column({ name: 'to_location_id', type: 'bigint', nullable: true })
  toLocationId: number | null;

  /**
   * Reference number (PO number, invoice number, etc.)
   */
  @Column({ name: 'reference_number', type: 'varchar', length: 128, nullable: true })
  referenceNumber: string | null;

  /**
   * Reference type (PURCHASE_ORDER, SALES_ORDER, ADJUSTMENT, etc.)
   */
  @Column({ name: 'reference_type', type: 'varchar', length: 64, nullable: true })
  referenceType: string | null;

  /**
   * Serial numbers (JSON array for serialized items)
   */
  @Column({ name: 'serial_numbers', type: 'jsonb', nullable: true })
  serialNumbers: string[] | null;

  /**
   * Lot/batch number
   */
  @Column({ name: 'lot_number', type: 'varchar', length: 128, nullable: true })
  lotNumber: string | null;

  /**
   * Expiry date (for perishable items)
   */
  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  /**
   * Notes/description
   */
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  /**
   * Stock quantity before transaction
   */
  @Column({ name: 'stock_before', type: 'decimal', precision: 15, scale: 2, nullable: true })
  stockBefore: number | null;

  /**
   * Stock quantity after transaction
   */
  @Column({ name: 'stock_after', type: 'decimal', precision: 15, scale: 2, nullable: true })
  stockAfter: number | null;

  /**
   * Transaction metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'transaction_metadata', type: 'jsonb', nullable: true })
  transactionMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
