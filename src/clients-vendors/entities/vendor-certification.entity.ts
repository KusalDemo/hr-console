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
import { Vendor } from './vendor.entity';

/**
 * Certification Status Enum
 */
export enum CertificationStatus {
  PENDING = 'PENDING', // Pending verification
  ACTIVE = 'ACTIVE', // Active certification
  EXPIRED = 'EXPIRED', // Expired certification
  REVOKED = 'REVOKED', // Revoked certification
}

/**
 * Vendor Certification Entity
 *
 * Certifications and credentials for vendors with expiration tracking.
 */
@Entity('vendor_certifications')
@Index('idx_vendor_certs_vendor', ['vendorId'])
@Index('idx_vendor_certs_status', ['certificationStatus'])
@Index('idx_vendor_certs_expiry', ['expirationDate'])
export class VendorCertification {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to vendor
   */
  @Column({ name: 'vendor_id', type: 'bigint', nullable: false })
  vendorId: number;

  /**
   * Vendor relationship
   */
  @ManyToOne(() => Vendor, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  /**
   * Certification name
   */
  @Column({ name: 'certification_name', type: 'varchar', length: 255, nullable: false })
  certificationName: string;

  /**
   * Certification type/category
   */
  @Column({ name: 'certification_type', type: 'varchar', length: 128, nullable: true })
  certificationType: string | null;

  /**
   * Certification number/license number
   */
  @Column({ name: 'certification_number', type: 'varchar', length: 128, nullable: true })
  certificationNumber: string | null;

  /**
   * Issuing organization
   */
  @Column({ name: 'issuing_organization', type: 'varchar', length: 255, nullable: true })
  issuingOrganization: string | null;

  /**
   * Issue date
   */
  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: Date | null;

  /**
   * Expiration date
   */
  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;

  /**
   * Certification status
   */
  @Column({
    name: 'certification_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CertificationStatus.PENDING,
  })
  certificationStatus: CertificationStatus;

  /**
   * Document URL (certificate document)
   */
  @Column({ name: 'document_url', type: 'text', nullable: true })
  documentUrl: string | null;

  /**
   * Notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Certification metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'certification_metadata', type: 'jsonb', nullable: true })
  certificationMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if certification is currently active
   */
  isCurrentlyActive(): boolean {
    if (this.certificationStatus !== CertificationStatus.ACTIVE) {
      return false;
    }

    if (this.expirationDate) {
      return this.expirationDate >= new Date();
    }

    return true;
  }

  /**
   * Check if certification is expired
   */
  isExpired(): boolean {
    if (this.expirationDate) {
      return this.expirationDate < new Date();
    }
    return false;
  }
}
