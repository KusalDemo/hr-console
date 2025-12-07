import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ClientRepository,
  VendorRepository,
  PurchaseOrderRepository,
  VendorRatingRepository,
  VendorCertificationRepository,
  ContractRepository,
} from '../repositories';
import {
  Client,
  ClientStatus,
  ClientTier,
  Vendor,
  VendorType,
  VendorStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderItem,
  VendorRating,
  RatingCategory,
  VendorCertification,
  CertificationStatus,
  Contract,
  ContractType,
  ContractStatus,
  RenewalStatus,
} from '../entities';
import { ContactService } from '../../contacts/services/contact.service';
import { ContactRepository } from '../../contacts/repositories/contact.repository';
import { ContactCategory } from '../../contacts/entities/contact.entity';

/**
 * Client Vendor Service
 * 
 * Manages clients, vendors, purchase orders, ratings, certifications, and contracts:
 * - Client and vendor CRUD operations
 * - Purchase order management
 * - Vendor performance tracking and ratings
 * - Vendor certifications
 * - Contract and agreement management
 */
@Injectable()
export class ClientVendorService {
  private readonly logger = new Logger(ClientVendorService.name);

  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly vendorRepository: VendorRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly vendorRatingRepository: VendorRatingRepository,
    private readonly vendorCertificationRepository: VendorCertificationRepository,
    private readonly contractRepository: ContractRepository,
    private readonly contactService: ContactService,
    private readonly contactRepository: ContactRepository,
  ) {}

  // ========== Client Methods ==========

  /**
   * Create a new client
   */
  async createClient(
    createDto: any, // Will be replaced with proper DTO
    createdBy?: number,
  ): Promise<any> {
    // Generate client number if not provided
    let clientNumber = createDto.clientNumber;
    if (!clientNumber) {
      clientNumber = await this.generateClientNumber();
    } else {
      const exists = await this.clientRepository.clientNumberExists(clientNumber);
      if (exists) {
        throw new ConflictException(`Client number '${clientNumber}' already exists`);
      }
    }

    const client = this.clientRepository.create({
      ...createDto,
      clientNumber,
      clientStatus: createDto.clientStatus || ClientStatus.ACTIVE,
      clientSince: createDto.clientSince ? new Date(createDto.clientSince) : new Date(),
      createdBy,
    });

    const saved = await this.clientRepository.save(client);

    this.logger.log(`Created client: ${saved.id} (${saved.clientNumber})`);

    return saved;
  }

  /**
   * Get client by ID
   */
  async getClientById(id: number, includeContact = false): Promise<Client> {
    const client = await this.clientRepository.findById(id, includeContact);

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  /**
   * Update client
   */
  async updateClient(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<Client> {
    const client = await this.clientRepository.findById(id);

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    if (client.isArchived) {
      throw new BadRequestException('Cannot update archived client');
    }

    Object.assign(client, {
      ...updateDto,
      clientSince: updateDto.clientSince ? new Date(updateDto.clientSince) : client.clientSince,
      updatedBy,
    });

    const saved = await this.clientRepository.save(client);

    this.logger.log(`Updated client: ${id}`);

    return saved;
  }

  // ========== Vendor Methods ==========

  /**
   * Create a new vendor
   */
  async createVendor(
    createDto: any,
    createdBy?: number,
  ): Promise<Vendor> {
    // Generate vendor number if not provided
    let vendorNumber = createDto.vendorNumber;
    if (!vendorNumber) {
      vendorNumber = await this.generateVendorNumber();
    } else {
      const exists = await this.vendorRepository.vendorNumberExists(vendorNumber);
      if (exists) {
        throw new ConflictException(`Vendor number '${vendorNumber}' already exists`);
      }
    }

    const vendor = this.vendorRepository.create({
      ...createDto,
      vendorNumber,
      vendorType: createDto.vendorType || VendorType.OTHER,
      vendorStatus: createDto.vendorStatus || VendorStatus.PENDING,
      vendorSince: createDto.vendorSince ? new Date(createDto.vendorSince) : new Date(),
      createdBy,
    });

    const saved = await this.vendorRepository.save(vendor);

    this.logger.log(`Created vendor: ${saved.id} (${saved.vendorNumber})`);

    return saved;
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(id: number, includeContact = false): Promise<Vendor> {
    const vendor = await this.vendorRepository.findById(id, includeContact);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  /**
   * Update vendor
   */
  async updateVendor(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<Vendor> {
    const vendor = await this.vendorRepository.findById(id);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    if (vendor.isArchived) {
      throw new BadRequestException('Cannot update archived vendor');
    }

    Object.assign(vendor, {
      ...updateDto,
      vendorSince: updateDto.vendorSince ? new Date(updateDto.vendorSince) : vendor.vendorSince,
      updatedBy,
    });

    const saved = await this.vendorRepository.save(vendor);

    this.logger.log(`Updated vendor: ${id}`);

    return saved;
  }

  // ========== Purchase Order Methods ==========

  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(
    createDto: any,
    createdBy?: number,
  ): Promise<PurchaseOrder> {
    // Generate PO number if not provided
    let poNumber = createDto.poNumber;
    if (!poNumber) {
      poNumber = await this.generatePONumber();
    } else {
      const exists = await this.purchaseOrderRepository.poNumberExists(poNumber);
      if (exists) {
        throw new ConflictException(`PO number '${poNumber}' already exists`);
      }
    }

    // Calculate totals from items
    let totalAmount = 0;
    let taxAmount = 0;
    if (createDto.items && Array.isArray(createDto.items)) {
      createDto.items.forEach((item: any) => {
        const lineTotal = item.quantityOrdered * item.unitPrice;
        totalAmount += lineTotal;
        taxAmount += lineTotal * (item.taxRate || 0) / 100;
      });
    }

    const grandTotal =
      totalAmount +
      taxAmount +
      (createDto.shippingAmount || 0) -
      (createDto.discountAmount || 0);

    const po = this.purchaseOrderRepository.create({
      ...createDto,
      poNumber,
      poDate: createDto.poDate ? new Date(createDto.poDate) : new Date(),
      expectedDeliveryDate: createDto.expectedDeliveryDate
        ? new Date(createDto.expectedDeliveryDate)
        : null,
      totalAmount,
      taxAmount,
      shippingAmount: createDto.shippingAmount || 0,
      discountAmount: createDto.discountAmount || 0,
      grandTotal,
      poStatus: createDto.poStatus || PurchaseOrderStatus.DRAFT,
      createdBy,
    });

    const saved = await this.purchaseOrderRepository.save(po);

    // Save items if provided
    if (createDto.items && Array.isArray(createDto.items)) {
      // Items will be saved via cascade
    }

    this.logger.log(`Created purchase order: ${saved.id} (${saved.poNumber})`);

    return saved;
  }

  /**
   * Get purchase order by ID
   */
  async getPurchaseOrderById(id: number, includeItems = false): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderRepository.findById(id, includeItems);

    if (!po) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }

    return po;
  }

  // ========== Vendor Rating Methods ==========

  /**
   * Add vendor rating
   */
  async addVendorRating(
    vendorId: number,
    ratingDto: any,
    ratedBy?: number,
  ): Promise<VendorRating> {
    const vendor = await this.vendorRepository.findById(vendorId);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const rating = this.vendorRatingRepository.create({
      vendorId,
      ratingCategory: ratingDto.ratingCategory || RatingCategory.OVERALL,
      ratingValue: ratingDto.ratingValue,
      ratingDate: ratingDto.ratingDate ? new Date(ratingDto.ratingDate) : new Date(),
      ratedBy,
      relatedPoId: ratingDto.relatedPoId || null,
      relatedProjectId: ratingDto.relatedProjectId || null,
      comments: ratingDto.comments || null,
      createdBy: ratedBy,
    });

    const saved = await this.vendorRatingRepository.save(rating);

    // Recalculate average rating
    await this.updateVendorAverageRating(vendorId);

    this.logger.log(`Added rating for vendor ${vendorId}: ${saved.ratingValue}`);

    return saved;
  }

  /**
   * Update vendor average rating
   */
  private async updateVendorAverageRating(vendorId: number): Promise<void> {
    const stats = await this.vendorRatingRepository.getRatingStatistics(vendorId);
    const vendor = await this.vendorRepository.findById(vendorId);

    if (vendor) {
      vendor.averageRating = stats.average;
      vendor.totalRatings = stats.total;
      await this.vendorRepository.save(vendor);
    }
  }

  // ========== Vendor Certification Methods ==========

  /**
   * Add vendor certification
   */
  async addVendorCertification(
    vendorId: number,
    certificationDto: any,
    createdBy?: number,
  ): Promise<VendorCertification> {
    const vendor = await this.vendorRepository.findById(vendorId);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const certification = this.vendorCertificationRepository.create({
      vendorId,
      certificationName: certificationDto.certificationName,
      certificationType: certificationDto.certificationType || null,
      certificationNumber: certificationDto.certificationNumber || null,
      issuingOrganization: certificationDto.issuingOrganization || null,
      issueDate: certificationDto.issueDate ? new Date(certificationDto.issueDate) : null,
      expirationDate: certificationDto.expirationDate
        ? new Date(certificationDto.expirationDate)
        : null,
      certificationStatus: certificationDto.certificationStatus || CertificationStatus.PENDING,
      documentUrl: certificationDto.documentUrl || null,
      notes: certificationDto.notes || null,
      createdBy,
    });

    const saved = await this.vendorCertificationRepository.save(certification);

    this.logger.log(`Added certification for vendor ${vendorId}: ${saved.certificationName}`);

    return saved;
  }

  // ========== Contract Methods ==========

  /**
   * Create a new contract
   */
  async createContract(
    createDto: any,
    createdBy?: number,
  ): Promise<Contract> {
    // Generate contract number if not provided
    let contractNumber = createDto.contractNumber;
    if (!contractNumber) {
      contractNumber = await this.generateContractNumber();
    } else {
      const exists = await this.contractRepository.contractNumberExists(contractNumber);
      if (exists) {
        throw new ConflictException(`Contract number '${contractNumber}' already exists`);
      }
    }

    const contract = this.contractRepository.create({
      ...createDto,
      contractNumber,
      contractType: createDto.contractType || ContractType.OTHER,
      contractStatus: createDto.contractStatus || ContractStatus.DRAFT,
      startDate: new Date(createDto.startDate),
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      renewalDate: createDto.renewalDate ? new Date(createDto.renewalDate) : null,
      createdBy,
    });

    const saved = await this.contractRepository.save(contract);

    this.logger.log(`Created contract: ${saved.id} (${saved.contractNumber})`);

    return saved;
  }

  /**
   * Get contract by ID
   */
  async getContractById(id: number, includeRelations = false): Promise<Contract> {
    const contract = await this.contractRepository.findById(id, includeRelations);

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    return contract;
  }

  // ========== Helper Methods ==========

  /**
   * Generate unique client number
   */
  private async generateClientNumber(): Promise<string> {
    const prefix = 'CLIENT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const clientNumber = `${prefix}-${timestamp}-${random}`;

    const exists = await this.clientRepository.clientNumberExists(clientNumber);
    if (exists) {
      return this.generateClientNumber();
    }

    return clientNumber;
  }

  /**
   * Generate unique vendor number
   */
  private async generateVendorNumber(): Promise<string> {
    const prefix = 'VENDOR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const vendorNumber = `${prefix}-${timestamp}-${random}`;

    const exists = await this.vendorRepository.vendorNumberExists(vendorNumber);
    if (exists) {
      return this.generateVendorNumber();
    }

    return vendorNumber;
  }

  /**
   * Generate unique PO number
   */
  private async generatePONumber(): Promise<string> {
    const prefix = 'PO';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const poNumber = `${prefix}-${timestamp}-${random}`;

    const exists = await this.purchaseOrderRepository.poNumberExists(poNumber);
    if (exists) {
      return this.generatePONumber();
    }

    return poNumber;
  }

  /**
   * Generate unique contract number
   */
  private async generateContractNumber(): Promise<string> {
    const prefix = 'CONTRACT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const contractNumber = `${prefix}-${timestamp}-${random}`;

    const exists = await this.contractRepository.contractNumberExists(contractNumber);
    if (exists) {
      return this.generateContractNumber();
    }

    return contractNumber;
  }
}

