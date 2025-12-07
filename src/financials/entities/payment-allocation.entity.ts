import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Payment } from './payment.entity';
import { Invoice } from './invoice.entity';

/**
 * Payment Allocation Entity
 * 
 * Allocate payments to invoices for payment tracking.
 */
@Entity('payment_allocations')
@Index('idx_payment_allocations_payment', ['paymentId'])
@Index('idx_payment_allocations_invoice', ['invoiceId'])
@Unique(['paymentId', 'invoiceId'])
export class PaymentAllocation {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Payment
   */
  @ManyToOne(() => Payment, (payment) => payment.allocations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'payment_id', type: 'bigint', nullable: false })
  paymentId: number;

  /**
   * Invoice
   */
  @ManyToOne(() => Invoice, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Promise<Invoice> | Invoice;

  @Column({ name: 'invoice_id', type: 'bigint', nullable: false })
  invoiceId: number;

  /**
   * Amount allocated to invoice
   */
  @Column({
    name: 'allocated_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  allocatedAmount: number;

  /**
   * Date of allocation
   */
  @Column({ name: 'allocation_date', type: 'date', nullable: false })
  allocationDate: Date;

  /**
   * Whether allocation is manual
   */
  @Column({ name: 'is_manual', type: 'boolean', nullable: false, default: false })
  isManual: boolean;

  /**
   * Allocation metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;
}
