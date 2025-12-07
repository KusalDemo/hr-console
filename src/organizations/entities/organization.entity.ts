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
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';

/**
 * Organization Type Enum
 */
export enum OrganizationType {
  COMPANY = 'COMPANY',
  DIVISION = 'DIVISION',
  DEPARTMENT = 'DEPARTMENT',
  SUBSIDIARY = 'SUBSIDIARY',
  BRANCH = 'BRANCH',
  TEAM = 'TEAM',
  OTHER = 'OTHER',
}

/**
 * Organization Status Enum
 */
export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Organization Entity - Represents organizations within a tenant
 *
 * Organizations support hierarchical structure (parent-child relationships)
 * and can have multiple types (company, division, department, etc.)
 *
 * Each tenant can have multiple organizations, with one default organization.
 */
@ObjectType()
@Entity('organizations')
@Index('idx_organizations_key', ['organizationKey'])
@Index('idx_organizations_parent', ['parentOrganization'])
@Index('idx_organizations_type', ['organizationType'])
@Index('idx_organizations_status', ['status'])
@Index('idx_organizations_default', ['isDefault'], { where: 'is_default = true' })
export class Organization {
  @Field(() => Int)
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Field(() => String)
  @Column({ name: 'organization_key', type: 'varchar', length: 128, unique: true, nullable: false })
  organizationKey: string;

  @Field(() => String)
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Parent organization for hierarchical structure
   * Null for root organizations
   */
  @ManyToOne(() => Organization, (org) => org.childOrganizations, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'parent_organization_id' })
  parentOrganization: Promise<Organization | null> | Organization | null;

  @Column({ name: 'parent_organization_id', type: 'bigint', nullable: true })
  parentOrganizationId: number | null;

  /**
   * Child organizations (sub-organizations)
   */
  @OneToMany(() => Organization, (org) => org.parentOrganization, {
    cascade: false,
    lazy: true,
  })
  childOrganizations: Promise<Organization[]> | Organization[];

  @Column({
    name: 'organization_type',
    type: 'varchar',
    length: 64,
    nullable: false,
    default: OrganizationType.COMPANY,
  })
  organizationType: OrganizationType;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  // Address fields
  @Column({ name: 'address_line1', type: 'varchar', length: 255, nullable: true })
  addressLine1: string | null;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  state: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 32, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ name: 'tax_id', type: 'varchar', length: 128, nullable: true })
  taxId: string | null;

  @Column({ name: 'registration_number', type: 'varchar', length: 128, nullable: true })
  registrationNumber: string | null;

  /**
   * Default organization flag
   * Only one organization per tenant should be marked as default
   */
  @Column({ name: 'is_default', type: 'boolean', default: false, nullable: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Organization memberships (users in this organization)
   * Relationship will be established through OrganizationMembership entity
   * Note: OrganizationMembership has organizationId as a column, not a relation
   * So we query memberships by organizationId in the service layer
   */
  // memberships relationship is handled via organizationId in OrganizationMembership

  /**
   * Check if organization is active
   */
  isActive(): boolean {
    return this.status === OrganizationStatus.ACTIVE;
  }

  /**
   * Check if organization is a root organization (no parent)
   */
  isRoot(): boolean {
    return this.parentOrganizationId === null;
  }

  /**
   * Get display name or fall back to name
   */
  getDisplayName(): string {
    return this.displayName || this.name;
  }

  /**
   * Check if this organization is a descendant of the given organization
   * @param ancestor - Potential ancestor organization
   * @returns True if this organization is a descendant
   */
  async isDescendantOf(ancestor: Organization): Promise<boolean> {
    if (!this.parentOrganizationId) {
      return false;
    }

    if (this.parentOrganizationId === ancestor.id) {
      return true;
    }

    // Resolve parent organization
    const parent = await Promise.resolve(this.parentOrganization);
    if (!parent) {
      return false;
    }

    // Recursively check parent
    return parent.isDescendantOf(ancestor);
  }

  /**
   * Get all ancestor organizations (parent, grandparent, etc.)
   * @returns Array of ancestor organizations
   */
  async getAncestors(): Promise<Organization[]> {
    const ancestors: Organization[] = [];
    let current: Organization | null = await Promise.resolve(this.parentOrganization);

    while (current) {
      ancestors.push(current);
      current = await Promise.resolve(current.parentOrganization);
    }

    return ancestors;
  }

  /**
   * Get full address as a formatted string
   */
  getFullAddress(): string {
    const parts: string[] = [];

    if (this.addressLine1) parts.push(this.addressLine1);
    if (this.addressLine2) parts.push(this.addressLine2);
    if (this.city) parts.push(this.city);
    if (this.state) parts.push(this.state);
    if (this.postalCode) parts.push(this.postalCode);
    if (this.country) parts.push(this.country);

    return parts.join(', ');
  }
}
