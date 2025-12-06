import { EmployeeType, EmploymentStatus } from '../entities/employee.entity';

/**
 * Employee Response DTO
 * Data transfer object for employee responses
 */
export interface EmployeeResponseDto {
  id: number;
  externalId: string | null;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  employeeType: EmployeeType;
  employmentStatus: EmploymentStatus;
  hireDate: string | null;
  terminationDate: string | null;
  terminationReason: string | null;
  costCenterId: number | null;
  departmentId: number | null;
  managerId: number | null;
  jobTitle: string | null;
  phone: string | null;
  mobile: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationalId: string | null;
  taxId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  profileMetadata: Record<string, any> | null;
  active: boolean;
  organizationId: number;
  organization: {
    id: number;
    organizationKey: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  // Computed fields
  isActive: boolean;
  isTerminated: boolean;
  isOnLeave: boolean;
  yearsOfService: number | null;
}

