import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { TenantAdminAuthService } from './tenant-admin-auth.service';
import { UserAuthService } from './user-auth.service';
import { LoginDto } from '../dto/login.dto';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

describe('AuthService', () => {
  let service: AuthService;
  let superAdminAuthService: jest.Mocked<SuperAdminAuthService>;
  let tenantAdminAuthService: jest.Mocked<TenantAdminAuthService>;
  let userAuthService: jest.Mocked<UserAuthService>;

  const mockTokenResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  const mockUserInfo = {
    userId: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    userType: 'user',
  };

  beforeEach(async () => {
    // Create mock services
    const mockSuperAdminAuthService = {
      login: jest.fn(),
      verifyMfa: jest.fn(),
      isAccountLocked: jest.fn(),
      getRemainingAttempts: jest.fn(),
    };

    const mockTenantAdminAuthService = {
      login: jest.fn(),
      verifyMfa: jest.fn(),
      isAccountLocked: jest.fn(),
      getRemainingAttempts: jest.fn(),
    };

    const mockUserAuthService = {
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SuperAdminAuthService,
          useValue: mockSuperAdminAuthService,
        },
        {
          provide: TenantAdminAuthService,
          useValue: mockTenantAdminAuthService,
        },
        {
          provide: UserAuthService,
          useValue: mockUserAuthService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    superAdminAuthService = module.get(SuperAdminAuthService);
    tenantAdminAuthService = module.get(TenantAdminAuthService);
    userAuthService = module.get(UserAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should authenticate super admin when no tenant header is provided', async () => {
      superAdminAuthService.login.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      const result = await service.login(undefined, loginDto, '127.0.0.1', 'test-agent');

      expect(superAdminAuthService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'test-agent');
      expect(tenantAdminAuthService.login).not.toHaveBeenCalled();
      expect(userAuthService.login).not.toHaveBeenCalled();
      expect(result).toEqual({
        token: mockTokenResponse,
        user: mockUserInfo,
      });
    });

    it('should authenticate super admin when empty tenant header is provided', async () => {
      superAdminAuthService.login.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      const result = await service.login('', loginDto, '127.0.0.1', 'test-agent');

      expect(superAdminAuthService.login).toHaveBeenCalled();
      expect(tenantAdminAuthService.login).not.toHaveBeenCalled();
      expect(userAuthService.login).not.toHaveBeenCalled();
      expect(result).toEqual({
        token: mockTokenResponse,
        user: mockUserInfo,
      });
    });

    it('should authenticate tenant admin when tenant header is provided and tenant admin exists', async () => {
      tenantAdminAuthService.login.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      const result = await service.login('test-tenant', loginDto, '127.0.0.1', 'test-agent');

      expect(tenantAdminAuthService.login).toHaveBeenCalledWith(
        'test-tenant',
        loginDto,
        '127.0.0.1',
        'test-agent',
      );
      expect(superAdminAuthService.login).not.toHaveBeenCalled();
      expect(userAuthService.login).not.toHaveBeenCalled();
      expect(result).toEqual({
        token: mockTokenResponse,
        user: mockUserInfo,
      });
    });

    it('should fallback to regular user when tenant admin login fails with non-auth error', async () => {
      tenantAdminAuthService.login.mockRejectedValue(
        new BusinessException(ErrorCode.VALIDATION_ERROR, 'Tenant not found'),
      );
      userAuthService.login.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      const result = await service.login('test-tenant', loginDto, '127.0.0.1', 'test-agent');

      expect(tenantAdminAuthService.login).toHaveBeenCalled();
      expect(userAuthService.login).toHaveBeenCalledWith(
        'test-tenant',
        loginDto,
        '127.0.0.1',
        'test-agent',
      );
      expect(result).toEqual({
        token: mockTokenResponse,
        user: mockUserInfo,
      });
    });

    it('should throw error when tenant admin login fails with auth error', async () => {
      const authError = new UnauthorizedException('Invalid credentials');
      tenantAdminAuthService.login.mockRejectedValue(authError);

      await expect(
        service.login('test-tenant', loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(tenantAdminAuthService.login).toHaveBeenCalled();
      expect(userAuthService.login).not.toHaveBeenCalled();
    });

    it('should throw error when both tenant admin and user login fail', async () => {
      tenantAdminAuthService.login.mockRejectedValue(
        new BusinessException(ErrorCode.VALIDATION_ERROR, 'Tenant not found'),
      );
      userAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(
        service.login('test-tenant', loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(tenantAdminAuthService.login).toHaveBeenCalled();
      expect(userAuthService.login).toHaveBeenCalled();
    });

    it('should normalize tenant key to lowercase', async () => {
      tenantAdminAuthService.login.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      await service.login('TEST-TENANT', loginDto, '127.0.0.1', 'test-agent');

      expect(tenantAdminAuthService.login).toHaveBeenCalledWith(
        'test-tenant',
        loginDto,
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should trim email in login dto', async () => {
      superAdminAuthService.login.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      const loginDtoWithSpaces: LoginDto = {
        email: '  test@example.com  ',
        password: 'password123',
      };

      await service.login(undefined, loginDtoWithSpaces, '127.0.0.1', 'test-agent');

      expect(superAdminAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        }),
        '127.0.0.1',
        'test-agent',
      );
    });
  });

  describe('verifyMfa', () => {
    it('should verify super admin MFA when no tenant header', async () => {
      superAdminAuthService.verifyMfa.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      const result = await service.verifyMfa(undefined, 'test@example.com', '123456');

      expect(superAdminAuthService.verifyMfa).toHaveBeenCalledWith('test@example.com', '123456');
      expect(result).toEqual({
        token: mockTokenResponse,
        user: mockUserInfo,
      });
    });

    it('should verify tenant admin MFA when tenant header is provided', async () => {
      tenantAdminAuthService.verifyMfa.mockResolvedValue({
        token: mockTokenResponse,
        user: mockUserInfo,
      });

      const result = await service.verifyMfa('test-tenant', 'test@example.com', '123456');

      expect(tenantAdminAuthService.verifyMfa).toHaveBeenCalledWith(
        'test-tenant',
        'test@example.com',
        '123456',
      );
      expect(result).toEqual({
        token: mockTokenResponse,
        user: mockUserInfo,
      });
    });

    it('should throw error when tenant admin MFA verification fails', async () => {
      tenantAdminAuthService.verifyMfa.mockRejectedValue(
        new BusinessException(ErrorCode.VALIDATION_ERROR, 'Invalid MFA code'),
      );

      await expect(service.verifyMfa('test-tenant', 'test@example.com', '123456')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('isAccountLocked', () => {
    it('should check super admin account lock when no tenant header', async () => {
      superAdminAuthService.isAccountLocked.mockResolvedValue(false);

      const result = await service.isAccountLocked(undefined, 'test@example.com');

      expect(superAdminAuthService.isAccountLocked).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe(false);
    });

    it('should check tenant admin account lock when tenant header is provided', async () => {
      tenantAdminAuthService.isAccountLocked.mockResolvedValue(true);

      const result = await service.isAccountLocked('test-tenant', 'test@example.com');

      expect(tenantAdminAuthService.isAccountLocked).toHaveBeenCalledWith(
        'test-tenant',
        'test@example.com',
      );
      expect(result).toBe(true);
    });

    it('should return false when tenant admin check fails', async () => {
      tenantAdminAuthService.isAccountLocked.mockRejectedValue(new Error('Tenant not found'));

      const result = await service.isAccountLocked('test-tenant', 'test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should get super admin remaining attempts when no tenant header', async () => {
      superAdminAuthService.getRemainingAttempts.mockResolvedValue(3);

      const result = await service.getRemainingAttempts(undefined, 'test@example.com');

      expect(superAdminAuthService.getRemainingAttempts).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe(3);
    });

    it('should get tenant admin remaining attempts when tenant header is provided', async () => {
      tenantAdminAuthService.getRemainingAttempts.mockResolvedValue(2);

      const result = await service.getRemainingAttempts('test-tenant', 'test@example.com');

      expect(tenantAdminAuthService.getRemainingAttempts).toHaveBeenCalledWith(
        'test-tenant',
        'test@example.com',
      );
      expect(result).toBe(2);
    });

    it('should return 0 when tenant admin check fails', async () => {
      tenantAdminAuthService.getRemainingAttempts.mockRejectedValue(new Error('Tenant not found'));

      const result = await service.getRemainingAttempts('test-tenant', 'test@example.com');

      expect(result).toBe(0);
    });
  });
});

