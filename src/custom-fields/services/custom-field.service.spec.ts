import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CustomFieldService } from './custom-field.service';
import { CustomFieldDefinitionRepository } from '../repositories/custom-field-definition.repository';
import { CustomFieldValueRepository } from '../repositories/custom-field-value.repository';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  CreateCustomFieldValueDto,
} from '../dto';
import { CustomFieldDefinition, CustomFieldType } from '../entities/custom-field-definition.entity';
import { CustomFieldValue } from '../entities/custom-field-value.entity';

describe('CustomFieldService', () => {
  let service: CustomFieldService;
  let fieldDefinitionRepository: jest.Mocked<CustomFieldDefinitionRepository>;
  let fieldValueRepository: jest.Mocked<CustomFieldValueRepository>;

  const mockFieldDefinition: CustomFieldDefinition = {
    id: 1,
    entityType: 'employee',
    fieldKey: 'custom_salary',
    fieldName: 'Custom Salary',
    fieldType: CustomFieldType.NUMBER,
    isRequired: false,
    isActive: true,
    displayOrder: 0,
    validationRules: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CustomFieldDefinition;

  const mockFieldValue: CustomFieldValue = {
    id: 1,
    fieldDefinitionId: 1,
    entityId: 100,
    stringValue: null,
    numberValue: 50000,
    dateValue: null,
    booleanValue: null,
    jsonValue: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    fieldDefinition: mockFieldDefinition,
  } as CustomFieldValue;

  beforeEach(async () => {
    const mockFieldDefinitionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByEntityType: jest.fn(),
      fieldKeyExists: jest.fn(),
    };

    const mockFieldValueRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByEntityAndField: jest.fn(),
      findByEntity: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldService,
        {
          provide: CustomFieldDefinitionRepository,
          useValue: mockFieldDefinitionRepo,
        },
        {
          provide: CustomFieldValueRepository,
          useValue: mockFieldValueRepo,
        },
      ],
    }).compile();

    service = module.get<CustomFieldService>(CustomFieldService);
    fieldDefinitionRepository = module.get(CustomFieldDefinitionRepository);
    fieldValueRepository = module.get(CustomFieldValueRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFieldDefinition', () => {
    const createDto: CreateCustomFieldDefinitionDto = {
      entityType: 'employee',
      fieldKey: 'custom_salary',
      fieldName: 'Custom Salary',
      fieldType: CustomFieldType.NUMBER,
      isRequired: false,
    };

    it('should create a field definition successfully', async () => {
      fieldDefinitionRepository.fieldKeyExists.mockResolvedValue(false);
      fieldDefinitionRepository.create.mockReturnValue(mockFieldDefinition);
      fieldDefinitionRepository.save.mockResolvedValue(mockFieldDefinition);

      const result = await service.createFieldDefinition(createDto, 1);

      expect(fieldDefinitionRepository.fieldKeyExists).toHaveBeenCalledWith(
        'employee',
        'custom_salary',
      );
      expect(fieldDefinitionRepository.create).toHaveBeenCalled();
      expect(fieldDefinitionRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('fieldKey', 'custom_salary');
    });

    it('should throw ConflictException if field key already exists', async () => {
      fieldDefinitionRepository.fieldKeyExists.mockResolvedValue(true);

      await expect(service.createFieldDefinition(createDto)).rejects.toThrow(ConflictException);

      expect(fieldDefinitionRepository.fieldKeyExists).toHaveBeenCalled();
      expect(fieldDefinitionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate dropdown fields require options', async () => {
      const dropdownDto: CreateCustomFieldDefinitionDto = {
        ...createDto,
        fieldType: CustomFieldType.DROPDOWN,
        // Missing options
      };

      fieldDefinitionRepository.fieldKeyExists.mockResolvedValue(false);

      await expect(service.createFieldDefinition(dropdownDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateFieldDefinition', () => {
    const updateDto: UpdateCustomFieldDefinitionDto = {
      fieldName: 'Updated Salary',
    };

    it('should update field definition successfully', async () => {
      fieldDefinitionRepository.findById.mockResolvedValue(mockFieldDefinition);
      fieldDefinitionRepository.save.mockResolvedValue({
        ...mockFieldDefinition,
        ...updateDto,
      } as CustomFieldDefinition);

      const result = await service.updateFieldDefinition(1, updateDto, 1);

      expect(fieldDefinitionRepository.findById).toHaveBeenCalledWith(1);
      expect(fieldDefinitionRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('fieldName', 'Updated Salary');
    });

    it('should throw NotFoundException if field definition not found', async () => {
      fieldDefinitionRepository.findById.mockResolvedValue(null);

      await expect(service.updateFieldDefinition(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check field key uniqueness when key is changed', async () => {
      const updateWithKey: UpdateCustomFieldDefinitionDto = {
        fieldKey: 'new_field_key',
      };

      fieldDefinitionRepository.findById.mockResolvedValue(mockFieldDefinition);
      fieldDefinitionRepository.fieldKeyExists.mockResolvedValue(true);

      await expect(service.updateFieldDefinition(1, updateWithKey)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getFieldDefinition', () => {
    it('should return field definition by id', async () => {
      fieldDefinitionRepository.findById.mockResolvedValue(mockFieldDefinition);

      const result = await service.getFieldDefinition(1);

      expect(fieldDefinitionRepository.findById).toHaveBeenCalledWith(1, true);
      expect(result).toHaveProperty('id', 1);
    });

    it('should throw NotFoundException if field definition not found', async () => {
      fieldDefinitionRepository.findById.mockResolvedValue(null);

      await expect(service.getFieldDefinition(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('setFieldValue', () => {
    const createValueDto: CreateCustomFieldValueDto = {
      fieldDefinitionId: 1,
      entityId: 100,
      value: 50000,
    };

    it('should create a new field value', async () => {
      fieldDefinitionRepository.findById.mockResolvedValue(mockFieldDefinition);
      fieldValueRepository.findByEntityAndField.mockResolvedValue(null);
      fieldValueRepository.create.mockReturnValue(mockFieldValue);
      fieldValueRepository.save.mockResolvedValue(mockFieldValue);

      const result = await service.setFieldValue(createValueDto, 1);

      expect(fieldDefinitionRepository.findById).toHaveBeenCalledWith(1);
      expect(fieldValueRepository.findByEntityAndField).toHaveBeenCalled();
      expect(fieldValueRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('numberValue', 50000);
    });

    it('should update existing field value', async () => {
      fieldDefinitionRepository.findById.mockResolvedValue(mockFieldDefinition);
      fieldValueRepository.findByEntityAndField.mockResolvedValue(mockFieldValue);
      fieldValueRepository.save.mockResolvedValue({
        ...mockFieldValue,
        numberValue: 60000,
      } as CustomFieldValue);

      const result = await service.setFieldValue({ ...createValueDto, value: 60000 }, 1);

      expect(fieldValueRepository.findByEntityAndField).toHaveBeenCalled();
      expect(fieldValueRepository.create).not.toHaveBeenCalled();
      expect(fieldValueRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('numberValue', 60000);
    });

    it('should throw NotFoundException if field definition not found', async () => {
      fieldDefinitionRepository.findById.mockResolvedValue(null);

      await expect(service.setFieldValue(createValueDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate value type matches field type', async () => {
      const stringField: CustomFieldDefinition = {
        ...mockFieldDefinition,
        fieldType: CustomFieldType.TEXT,
      };

      fieldDefinitionRepository.findById.mockResolvedValue(stringField);

      // Try to set number value for text field
      await expect(service.setFieldValue({ ...createValueDto, value: 50000 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFieldValue', () => {
    it('should return field value by id', async () => {
      fieldValueRepository.findById.mockResolvedValue(mockFieldValue);

      const result = await service.getFieldValue(1);

      expect(fieldValueRepository.findById).toHaveBeenCalledWith(1, true);
      expect(result).toHaveProperty('id', 1);
    });

    it('should throw NotFoundException if field value not found', async () => {
      fieldValueRepository.findById.mockResolvedValue(null);

      await expect(service.getFieldValue(999)).rejects.toThrow(NotFoundException);
    });
  });
});


