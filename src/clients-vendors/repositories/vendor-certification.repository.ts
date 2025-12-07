import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { VendorCertification, CertificationStatus } from '../entities/vendor-certification.entity';

/**
 * Vendor Certification Repository
 *
 * Custom repository methods for vendor certification queries.
 */
@Injectable()
export class VendorCertificationRepository extends Repository<VendorCertification> {
  constructor(private dataSource: DataSource) {
    super(VendorCertification, dataSource.createEntityManager());
  }

  /**
   * Find certifications by vendor
   */
  async findByVendor(
    vendorId: number,
    status?: CertificationStatus,
  ): Promise<VendorCertification[]> {
    const query = this.createQueryBuilder('cert')
      .where('cert.vendorId = :vendorId', { vendorId })
      .orderBy('cert.expirationDate', 'ASC')
      .addOrderBy('cert.certificationName', 'ASC');

    if (status) {
      query.andWhere('cert.certificationStatus = :status', { status });
    }

    return query.getMany();
  }

  /**
   * Find expiring certifications
   */
  async findExpiring(daysAhead: number, organizationId?: number): Promise<VendorCertification[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    const query = this.createQueryBuilder('cert')
      .leftJoinAndSelect('cert.vendor', 'vendor')
      .where('cert.expirationDate IS NOT NULL')
      .andWhere('cert.expirationDate <= :thresholdDate', { thresholdDate })
      .andWhere('cert.certificationStatus = :status', {
        status: CertificationStatus.ACTIVE,
      })
      .orderBy('cert.expirationDate', 'ASC');

    if (organizationId) {
      query.andWhere('vendor.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }
}
