import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantInitializationService } from './tenant-initialization.service';
import { EmailService } from '../../email/email.service';
import { CreateTenantDto, UpdateTenantDto } from '../dto';
import { Tenant } from '../../admin/entities/tenant.entity';

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let tenantProvisioningService: jest.Mocked<TenantProvisioningService>;
  let tenantInitializationService: jest.Mocked<TenantInitializationService>;
  let emailService: jest.Mocked<EmailService>;

  const mockTenant: Tenant = {
    id: 1,
    tenantKey: 'test-tenant',
    name: 'Test Tenant',
    status: 'active',
    subscriptionStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Tenant;

  beforeEach(async () => {
    const mockTenantRepository = {
      findByKey: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
    };

    const mockTenantProvisioningService = {
      provisionTenant: jest.fn(),
    };

    const mockTenantInitializationService = {
      initializeTenant: jest.fn(),
    };

    const mockEmailService = {
      sendTenantAdminWelcomeEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: TenantRepository,
          useValue: mockTenantRepository,
        },
        {
          provide: TenantProvisioningService,
          useValue: mockTenantProvisioningService,
        },
        {
          provide: TenantInitializationService,
          useValue: mockTenantInitializationService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    tenantRepository = module.get(TenantRepository);
    tenantProvisioningService = module.get(TenantProvisioningService);
    tenantInitializationService = module.get(TenantInitializationService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    const createTenantDto: CreateTenantDto = {
      tenantKey: 'test-tenant',
      name: 'Test Tenant',
      tenantAdminEmail: 'admin@test.com',
      tenantAdminPassword: 'Password123!',
      tenantAdminFullName: 'Test Admin',
    };

    it('should create a tenant successfully', async () => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantProvisioningService.provisionTenant.mockResolvedValue(mockTenant);
      tenantInitializationService.initializeTenant.mockResolvedValue(undefined);
      emailService.sendTenantAdminWelcomeEmail.mockResolvedValue(undefined);

      const result = await service.createTenant(createTenantDto);

      expect(tenantRepository.exists).toHaveBeenCalledWith('test-tenant');
      expect(tenantProvisioningService.provisionTenant).toHaveBeenCalledWith(
        'test-tenant',
        'Test Tenant',
      );
      expect(tenantInitializationService.initializeTenant).toHaveBeenCalledWith(
        mockTenant,
        'admin@test.com',
        'Password123!',
        'Test Admin',
      );
      expect(result).toHaveProperty('tenant');
      expect(result.tenant.tenantKey).toBe('test-tenant');
    });

    it('should throw ConflictException if tenant key already exists', async () => {
      tenantRepository.exists.mockResolvedValue(true);

      await expect(service.createTenant(createTenantDto)).rejects.toThrow(ConflictException);

      expect(tenantRepository.exists).toHaveBeenCalledWith('test-tenant');
      expect(tenantProvisioningService.provisionTenant).not.toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantProvisioningService.provisionTenant.mockResolvedValue(mockTenant);
      tenantInitializationService.initializeTenant.mockResolvedValue(undefined);
      emailService.sendTenantAdminWelcomeEmail.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      const result = await service.createTenant(createTenantDto);

      expect(result).toHaveProperty('tenant');
      expect(result.emailSent).toBe(false);
      expect(result.emailError).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all tenants', async () => {
      const tenants = [mockTenant];
      tenantRepository.findAll.mockResolvedValue(tenants);

      const result = await service.findAll();

      expect(tenantRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(tenants);
    });

    it('should return empty array when no tenants exist', async () => {
      tenantRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return tenant by key', async () => {
      tenantRepository.findByKey.mockResolvedValue(mockTenant);

      const result = await service.findOne('test-tenant');

      expect(tenantRepository.findByKey).toHaveBeenCalledWith('test-tenant');
      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      tenantRepository.findByKey.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTenant', () => {
    const updateTenantDto: UpdateTenantDto = {
      name: 'Updated Tenant Name',
      status: 'suspended',
    };

    it('should update tenant successfully', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue({
        ...mockTenant,
        ...updateTenantDto,
      } as Tenant);

      const result = await service.updateTenant(1, updateTenantDto);

      expect(tenantRepository.findById).toHaveBeenCalledWith(1);
      expect(tenantRepository.update).toHaveBeenCalledWith(1, updateTenantDto);
      expect(result.name).toBe('Updated Tenant Name');
      expect(result.status).toBe('suspended');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      tenantRepository.findById.mockResolvedValue(null);

      await expect(service.updateTenant(999, updateTenantDto)).rejects.toThrow(NotFoundException);
    });
  });
});

