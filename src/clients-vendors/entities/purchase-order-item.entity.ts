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
import { PurchaseOrder } from './purchase-order.entity';

/**
 * Purchase Order Item Entity
 *
 * Line items for purchase orders with quantity, price, and received quantity tracking.
 */
@Entity('purchase_order_items')
@Index('idx_po_items_po', ['purchaseOrderId'])
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to purchase order
   */
  @Column({ name: 'purchase_order_id', type: 'bigint', nullable: false })
  purchaseOrderId: number;

  /**
   * Purchase order relationship
   */
  @ManyToOne(() => PurchaseOrder, (po) => po.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  /**
   * Line item number
   */
  @Column({ name: 'line_number', type: 'integer', nullable: false })
  lineNumber: number;

  /**
   * Item description
   */
  @Column({ name: 'item_description', type: 'varchar', length: 500, nullable: false })
  itemDescription: string;

  /**
   * Item SKU / Part number
   */
  @Column({ name: 'item_sku', type: 'varchar', length: 128, nullable: true })
  itemSku: string | null;

  /**
   * Quantity ordered
   */
  @Column({ name: 'quantity_ordered', type: 'decimal', precision: 15, scale: 3, nullable: false })
  quantityOrdered: number;

  /**
   * Quantity received
   */
  @Column({
    name: 'quantity_received',
    type: 'decimal',
    precision: 15,
    scale: 3,
    nullable: false,
    default: 0,
  })
  quantityReceived: number;

  /**
   * Unit price
   */
  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2, nullable: false })
  unitPrice: number;

  /**
   * Unit of measure
   */
  @Column({ name: 'unit_of_measure', type: 'varchar', length: 32, nullable: true })
  unitOfMeasure: string | null;

  /**
   * Line total (quantity * unit price)
   */
  @Column({ name: 'line_total', type: 'decimal', precision: 15, scale: 2, nullable: false })
  lineTotal: number;

  /**
   * Tax rate (percentage)
   */
  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  taxRate: number;

  /**
   * Tax amount
   */
  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  taxAmount: number;

  /**
   * Expected delivery date for this item
   */
  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate: Date | null;

  /**
   * Actual delivery date for this item
   */
  @Column({ name: 'actual_delivery_date', type: 'date', nullable: true })
  actualDeliveryDate: Date | null;

  /**
   * Notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if item is fully received
   */
  isFullyReceived(): boolean {
    return this.quantityReceived >= this.quantityOrdered;
  }

  /**
   * Get remaining quantity to receive
   */
  getRemainingQuantity(): number {
    return Math.max(0, this.quantityOrdered - this.quantityReceived);
  }
}
