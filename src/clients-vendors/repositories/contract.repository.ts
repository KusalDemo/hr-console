import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Contract,
  ContractType,
  ContractStatus,
  RenewalStatus,
} from '../entities/contract.entity';

/**
 * Contract Repository
 * 
 * Custom repository methods for contract queries.
 */
@Injectable()
export class ContractRepository extends Repository<Contract> {
  constructor(private dataSource: DataSource) {
    super(Contract, dataSource.createEntityManager());
  }

  /**
   * Find contract by number
   */
  async findByNumber(contractNumber: string): Promise<Contract | null> {
    return this.createQueryBuilder('contract')
      .leftJoinAndSelect('contract.client', 'client')
      .leftJoinAndSelect('contract.vendor', 'vendor')
      .leftJoinAndSelect('contract.contact', 'contact')
      .where('contract.contractNumber = :contractNumber', { contractNumber })
      .getOne();
  }

  /**
   * Find contract by ID
   */
  async findById(id: number, includeRelations = false): Promise<Contract | null> {
    const query = this.createQueryBuilder('contract').where('contract.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('contract.client', 'client')
        .leftJoinAndSelect('contract.vendor', 'vendor')
        .leftJoinAndSelect('contract.contact', 'contact');
    }

    return query.getOne();
  }

  /**
   * Find contracts by client
   */
  async findByClient(
    clientId: number,
    organizationId?: number,
  ): Promise<Contract[]> {
    const query = this.createQueryBuilder('contract')
      .where('contract.clientId = :clientId', { clientId })
      .orderBy('contract.startDate', 'DESC');

    if (organizationId) {
      query.andWhere('contract.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find contracts by vendor
   */
  async findByVendor(
    vendorId: number,
    organizationId?: number,
  ): Promise<Contract[]> {
    const query = this.createQueryBuilder('contract')
      .where('contract.vendorId = :vendorId', { vendorId })
      .orderBy('contract.startDate', 'DESC');

    if (organizationId) {
      query.andWhere('contract.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find contracts by status
   */
  async findByStatus(
    status: ContractStatus,
    organizationId?: number,
  ): Promise<Contract[]> {
    const query = this.createQueryBuilder('contract')
      .where('contract.contractStatus = :status', { status })
      .orderBy('contract.startDate', 'DESC');

    if (organizationId) {
      query.andWhere('contract.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find contracts needing renewal
   */
  async findNeedingRenewal(
    daysAhead: number,
    organizationId?: number,
  ): Promise<Contract[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    const query = this.createQueryBuilder('contract')
      .where('contract.renewalDate IS NOT NULL')
      .andWhere('contract.renewalDate <= :thresholdDate', { thresholdDate })
      .andWhere('contract.autoRenew = :autoRenew', { autoRenew: true })
      .andWhere('contract.contractStatus = :status', { status: ContractStatus.ACTIVE })
      .orderBy('contract.renewalDate', 'ASC');

    if (organizationId) {
      query.andWhere('contract.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find expiring contracts
   */
  async findExpiring(
    daysAhead: number,
    organizationId?: number,
  ): Promise<Contract[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    const query = this.createQueryBuilder('contract')
      .where('contract.endDate IS NOT NULL')
      .andWhere('contract.endDate <= :thresholdDate', { thresholdDate })
      .andWhere('contract.contractStatus = :status', { status: ContractStatus.ACTIVE })
      .orderBy('contract.endDate', 'ASC');

    if (organizationId) {
      query.andWhere('contract.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Check if contract number exists
   */
  async contractNumberExists(contractNumber: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('contract')
      .where('contract.contractNumber = :contractNumber', { contractNumber });

    if (excludeId) {
      query.andWhere('contract.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

