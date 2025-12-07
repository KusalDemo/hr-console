import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsVendorsController } from './clients-vendors.controller';
import { ClientVendorService } from './services';
import {
  ClientRepository,
  VendorRepository,
  PurchaseOrderRepository,
  VendorRatingRepository,
  VendorCertificationRepository,
  ContractRepository,
} from './repositories';
import {
  Client,
  Vendor,
  PurchaseOrder,
  PurchaseOrderItem,
  VendorRating,
  VendorCertification,
  Contract,
} from './entities';
import { ContactsModule } from '../contacts/contacts.module';

/**
 * Clients Vendors Module
 * 
 * Provides advanced client/vendor relationship management:
 * - Client and vendor CRUD operations
 * - Purchase order management
 * - Vendor performance tracking and ratings
 * - Vendor certifications
 * - Contract and agreement management
 * - SLA tracking
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      Vendor,
      PurchaseOrder,
      PurchaseOrderItem,
      VendorRating,
      VendorCertification,
      Contract,
    ]),
    ContactsModule,
  ],
  controllers: [ClientsVendorsController],
  providers: [
    ClientVendorService,
    ClientRepository,
    VendorRepository,
    PurchaseOrderRepository,
    VendorRatingRepository,
    VendorCertificationRepository,
    ContractRepository,
  ],
  exports: [
    ClientVendorService,
    ClientRepository,
    VendorRepository,
    PurchaseOrderRepository,
    VendorRatingRepository,
    VendorCertificationRepository,
    ContractRepository,
  ],
})
export class ClientsVendorsModule {}

