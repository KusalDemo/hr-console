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
import { Client } from './client.entity';
import { Vendor } from './vendor.entity';
import { Contact } from '../../contacts/entities/contact.entity';

/**
 * Contract Type Enum
 */
export enum ContractType {
  SERVICE = 'SERVICE', // Service contract
  PRODUCT = 'PRODUCT', // Product contract
  SLA = 'SLA', // Service Level Agreement
  MAINTENANCE = 'MAINTENANCE', // Maintenance contract
  NDA = 'NDA', // Non-Disclosure Agreement
  MSA = 'MSA', // Master Service Agreement
  OTHER = 'OTHER', // Other
}

/**
 * Contract Status Enum
 */
export enum ContractStatus {
  DRAFT = 'DRAFT', // Draft
  ACTIVE = 'ACTIVE', // Active
  PENDING = 'PENDING', // Pending approval
  EXPIRED = 'EXPIRED', // Expired
  TERMINATED = 'TERMINATED', // Terminated
  RENEWED = 'RENEWED', // Renewed (replaced by new contract)
}

/**
 * Renewal Status Enum
 */
export enum RenewalStatus {
  PENDING = 'PENDING', // Pending renewal
  APPROVED = 'APPROVED', // Renewal approved
  REJECTED = 'REJECTED', // Renewal rejected
  CANCELLED = 'CANCELLED', // Renewal cancelled
}

/**
 * Contract Entity
 *
 * Contracts and agreements with renewal management, SLA tracking, and signature tracking.
 */
@Entity('contracts')
@Index('idx_contracts_number', ['contractNumber'])
@Index('idx_contracts_key', ['contractKey'])
@Index('idx_contracts_client', ['clientId'])
@Index('idx_contracts_vendor', ['vendorId'])
@Index('idx_contracts_type', ['contractType'])
@Index('idx_contracts_status', ['contractStatus'])
@Index('idx_contracts_renewal', ['renewalDate'])
export class Contract {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique contract number
   */
  @Column({ name: 'contract_number', type: 'varchar', length: 128, unique: true, nullable: false })
  contractNumber: string;

  /**
   * Optional contract key
   */
  @Column({ name: 'contract_key', type: 'varchar', length: 128, unique: true, nullable: true })
  contractKey: string | null;

  /**
   * Reference to client (if client contract)
   */
  @Column({ name: 'client_id', type: 'bigint', nullable: true })
  clientId: number | null;

  /**
   * Client relationship
   */
  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  /**
   * Reference to vendor (if vendor contract)
   */
  @Column({ name: 'vendor_id', type: 'bigint', nullable: true })
  vendorId: number | null;

  /**
   * Vendor relationship
   */
  @ManyToOne(() => Vendor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor | null;

  /**
   * General contact reference
   */
  @Column({ name: 'contact_id', type: 'bigint', nullable: true })
  contactId: number | null;

  /**
   * Contact relationship
   */
  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  /**
   * Contract type
   */
  @Column({
    name: 'contract_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ContractType.OTHER,
  })
  contractType: ContractType;

  /**
   * Contract category
   */
  @Column({ name: 'contract_category', type: 'varchar', length: 128, nullable: true })
  contractCategory: string | null;

  /**
   * Contract status
   */
  @Column({
    name: 'contract_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ContractStatus.DRAFT,
  })
  contractStatus: ContractStatus;

  /**
   * Contract name
   */
  @Column({ name: 'contract_name', type: 'varchar', length: 255, nullable: false })
  contractName: string;

  /**
   * Description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Start date
   */
  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: Date;

  /**
   * End date
   */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  /**
   * Auto-renew flag
   */
  @Column({ name: 'auto_renew', type: 'boolean', nullable: false, default: false })
  autoRenew: boolean;

  /**
   * Renewal term in months
   */
  @Column({ name: 'renewal_term_months', type: 'integer', nullable: true })
  renewalTermMonths: number | null;

  /**
   * Termination notice period in days
   */
  @Column({ name: 'termination_notice_days', type: 'integer', nullable: true })
  terminationNoticeDays: number | null;

  /**
   * Contract value
   */
  @Column({ name: 'contract_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  contractValue: number | null;

  /**
   * Currency code
   */
  @Column({ type: 'varchar', length: 8, nullable: false, default: 'USD' })
  currency: string;

  /**
   * Payment schedule
   */
  @Column({ name: 'payment_schedule', type: 'varchar', length: 128, nullable: true })
  paymentSchedule: string | null;

  /**
   * Payment amount per period
   */
  @Column({ name: 'payment_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  paymentAmount: number | null;

  /**
   * Contract document URL
   */
  @Column({ name: 'contract_document_url', type: 'text', nullable: true })
  contractDocumentUrl: string | null;

  /**
   * Signed document URL
   */
  @Column({ name: 'signed_document_url', type: 'text', nullable: true })
  signedDocumentUrl: string | null;

  /**
   * Terms and conditions
   */
  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions: string | null;

  /**
   * Signed by client flag
   */
  @Column({ name: 'signed_by_client', type: 'boolean', nullable: false, default: false })
  signedByClient: boolean;

  /**
   * Signed by us flag
   */
  @Column({ name: 'signed_by_us', type: 'boolean', nullable: false, default: false })
  signedByUs: boolean;

  /**
   * Client signature date
   */
  @Column({ name: 'client_signature_date', type: 'date', nullable: true })
  clientSignatureDate: Date | null;

  /**
   * Our signature date
   */
  @Column({ name: 'our_signature_date', type: 'date', nullable: true })
  ourSignatureDate: Date | null;

  /**
   * Signed by client user ID
   */
  @Column({ name: 'signed_by_client_user', type: 'bigint', nullable: true })
  signedByClientUser: number | null;

  /**
   * Signed by us user ID
   */
  @Column({ name: 'signed_by_us_user', type: 'bigint', nullable: true })
  signedByUsUser: number | null;

  /**
   * Renewal date
   */
  @Column({ name: 'renewal_date', type: 'date', nullable: true })
  renewalDate: Date | null;

  /**
   * Renewal status
   */
  @Column({
    name: 'renewal_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  renewalStatus: RenewalStatus | null;

  /**
   * Renewed from contract ID (original contract if renewed)
   */
  @Column({ name: 'renewed_from_contract_id', type: 'bigint', nullable: true })
  renewedFromContractId: number | null;

  /**
   * Renewed to contract ID (new contract if renewed)
   */
  @Column({ name: 'renewed_to_contract_id', type: 'bigint', nullable: true })
  renewedToContractId: number | null;

  /**
   * Tags
   */
  @Column({ type: 'text', nullable: true })
  tags: string | null;

  /**
   * Custom data (JSONB)
   */
  @Column({ name: 'custom_data', type: 'jsonb', nullable: true })
  customData: Record<string, any> | null;

  /**
   * Metadata (JSONB)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Approved by user ID
   */
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: number | null;

  /**
   * Approval date
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * Whether contract is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether contract is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if contract is currently active
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive || this.isArchived) {
      return false;
    }

    if (this.contractStatus !== ContractStatus.ACTIVE) {
      return false;
    }

    const now = new Date();
    if (this.startDate > now) {
      return false;
    }

    if (this.endDate && this.endDate < now) {
      return false;
    }

    return true;
  }

  /**
   * Check if contract needs renewal
   */
  needsRenewal(daysAhead = 30): boolean {
    if (!this.renewalDate || !this.autoRenew) {
      return false;
    }

    const renewalDate = new Date(this.renewalDate);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    return renewalDate <= thresholdDate;
  }
}
