import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FormDefinitionRepository } from '../repositories/form-definition.repository';
import { FormResponseRepository } from '../repositories/form-response.repository';
import {
  FormDefinition,
  FormStatus,
  FormAccessType,
} from '../entities/form-definition.entity';
import { FormResponse, FormResponseStatus } from '../entities/form-response.entity';
import { FormValidationService } from './form-validation.service';

/**
 * Form Service
 * 
 * Manages forms with:
 * - Form CRUD operations
 * - Form templates and cloning
 * - Form versioning
 * - Form publishing
 * - Response management
 */
@Injectable()
export class FormService {
  private readonly logger = new Logger(FormService.name);

  constructor(
    private readonly formDefinitionRepository: FormDefinitionRepository,
    private readonly formResponseRepository: FormResponseRepository,
    private readonly formValidationService: FormValidationService,
  ) {}

  /**
   * Create a new form definition
   */
  async createFormDefinition(createDto: any, createdBy?: number): Promise<FormDefinition> {
    // Validate form schema
    if (!createDto.formSchema) {
      throw new BadRequestException('Form schema is required');
    }

    this.formValidationService.validateFormSchema(createDto.formSchema);

    const form = this.formDefinitionRepository.create({
      ...createDto,
      status: createDto.status || FormStatus.DRAFT,
      accessType: createDto.accessType || FormAccessType.AUTHENTICATED,
      formVersion: 1,
      isTemplate: createDto.isTemplate || false,
      isActive: true,
      allowAnonymous: createDto.allowAnonymous || false,
      allowMultipleSubmissions: createDto.allowMultipleSubmissions !== false,
      createdBy,
    });

    const saved = await this.formDefinitionRepository.save(form);

    this.logger.log(`Created form definition: ${saved.id} (${saved.formName})`);

    return saved;
  }

  /**
   * Get form definition by ID
   */
  async getFormDefinitionById(
    id: number,
    includeResponses = false,
  ): Promise<FormDefinition> {
    const form = await this.formDefinitionRepository.findById(id, includeResponses);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${id} not found`);
    }

    return form;
  }

  /**
   * Update form definition
   */
  async updateFormDefinition(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<FormDefinition> {
    const form = await this.formDefinitionRepository.findById(id);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${id} not found`);
    }

    // Validate form schema if provided
    if (updateDto.formSchema) {
      this.formValidationService.validateFormSchema(updateDto.formSchema);
    }

    // If form is published and schema is being updated, create a new version
    if (form.status === FormStatus.PUBLISHED && updateDto.formSchema) {
      return this.createNewVersion(id, updateDto, updatedBy);
    }

    Object.assign(form, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.formDefinitionRepository.save(form);

    this.logger.log(`Updated form definition: ${saved.id} (${saved.formName})`);

    return saved;
  }

  /**
   * Create new version of form
   */
  async createNewVersion(
    parentFormId: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<FormDefinition> {
    const parentForm = await this.formDefinitionRepository.findById(parentFormId);

    if (!parentForm) {
      throw new NotFoundException(`Parent form with ID ${parentFormId} not found`);
    }

    const newVersion = this.formDefinitionRepository.create({
      formName: updateDto.formName || parentForm.formName,
      formDescription: updateDto.formDescription || parentForm.formDescription,
      organizationId: parentForm.organizationId,
      status: FormStatus.DRAFT,
      accessType: updateDto.accessType || parentForm.accessType,
      formSchema: updateDto.formSchema || parentForm.formSchema,
      formVersion: parentForm.formVersion + 1,
      parentFormId: parentForm.id,
      isTemplate: parentForm.isTemplate,
      isActive: true,
      allowAnonymous: updateDto.allowAnonymous ?? parentForm.allowAnonymous,
      allowMultipleSubmissions:
        updateDto.allowMultipleSubmissions ?? parentForm.allowMultipleSubmissions,
      maxSubmissionsPerUser:
        updateDto.maxSubmissionsPerUser ?? parentForm.maxSubmissionsPerUser,
      category: updateDto.category || parentForm.category,
      tags: updateDto.tags || parentForm.tags,
      permissionsConfig: updateDto.permissionsConfig || parentForm.permissionsConfig,
      workflowId: updateDto.workflowId || parentForm.workflowId,
      notificationConfig: updateDto.notificationConfig || parentForm.notificationConfig,
      formSettings: updateDto.formSettings || parentForm.formSettings,
      createdBy: updatedBy,
    });

    const saved = await this.formDefinitionRepository.save(newVersion);

    this.logger.log(
      `Created new version ${saved.formVersion} of form ${parentFormId}`,
    );

    return saved;
  }

  /**
   * Publish form
   */
  async publishForm(id: number, updatedBy?: number): Promise<FormDefinition> {
    const form = await this.formDefinitionRepository.findById(id);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${id} not found`);
    }

    if (form.status === FormStatus.PUBLISHED) {
      throw new BadRequestException('Form is already published');
    }

    form.status = FormStatus.PUBLISHED;
    form.updatedBy = updatedBy;

    const saved = await this.formDefinitionRepository.save(form);

    this.logger.log(`Published form: ${saved.id} (${saved.formName})`);

    return saved;
  }

  /**
   * Archive form
   */
  async archiveForm(id: number, updatedBy?: number): Promise<FormDefinition> {
    const form = await this.formDefinitionRepository.findById(id);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${id} not found`);
    }

    form.status = FormStatus.ARCHIVED;
    form.isActive = false;
    form.updatedBy = updatedBy;

    const saved = await this.formDefinitionRepository.save(form);

    this.logger.log(`Archived form: ${saved.id} (${saved.formName})`);

    return saved;
  }

  /**
   * Delete form definition
   */
  async deleteFormDefinition(id: number): Promise<void> {
    const form = await this.formDefinitionRepository.findById(id);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${id} not found`);
    }

    await this.formDefinitionRepository.remove(form);

    this.logger.log(`Deleted form definition: ${id}`);
  }

  /**
   * Clone form from template or existing form
   */
  async cloneForm(
    sourceFormId: number,
    newFormName: string,
    organizationId: number,
    createdBy?: number,
  ): Promise<FormDefinition> {
    const sourceForm = await this.formDefinitionRepository.findById(sourceFormId);

    if (!sourceForm) {
      throw new NotFoundException(`Source form with ID ${sourceFormId} not found`);
    }

    const newForm = this.formDefinitionRepository.create({
      formName: newFormName,
      formDescription: sourceForm.formDescription,
      organizationId,
      status: FormStatus.DRAFT,
      accessType: sourceForm.accessType,
      formSchema: JSON.parse(JSON.stringify(sourceForm.formSchema)),
      formVersion: 1,
      templateId: sourceForm.isTemplate ? sourceForm.id : sourceForm.templateId,
      isTemplate: false,
      isActive: true,
      allowAnonymous: sourceForm.allowAnonymous,
      allowMultipleSubmissions: sourceForm.allowMultipleSubmissions,
      maxSubmissionsPerUser: sourceForm.maxSubmissionsPerUser,
      category: sourceForm.category,
      tags: sourceForm.tags ? [...sourceForm.tags] : null,
      permissionsConfig: sourceForm.permissionsConfig
        ? JSON.parse(JSON.stringify(sourceForm.permissionsConfig))
        : null,
      workflowId: sourceForm.workflowId,
      notificationConfig: sourceForm.notificationConfig
        ? JSON.parse(JSON.stringify(sourceForm.notificationConfig))
        : null,
      formSettings: sourceForm.formSettings
        ? JSON.parse(JSON.stringify(sourceForm.formSettings))
        : null,
      createdBy,
    });

    const saved = await this.formDefinitionRepository.save(newForm);

    this.logger.log(`Cloned form: ${sourceFormId} -> ${saved.id} (${saved.formName})`);

    return saved;
  }

  /**
   * Submit form response
   */
  async submitFormResponse(
    formDefinitionId: number,
    responseData: Record<string, any>,
    submittedBy?: number,
    isAnonymous = false,
    anonymousIdentifier?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<FormResponse> {
    const form = await this.formDefinitionRepository.findById(formDefinitionId);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${formDefinitionId} not found`);
    }

    if (form.status !== FormStatus.PUBLISHED) {
      throw new BadRequestException('Form is not published');
    }

    if (!form.isActive) {
      throw new BadRequestException('Form is not active');
    }

    // Check if anonymous submissions are allowed
    if (isAnonymous && !form.allowAnonymous) {
      throw new BadRequestException('Anonymous submissions are not allowed for this form');
    }

    // Check if user has already submitted (if multiple submissions not allowed)
    if (!form.allowMultipleSubmissions && submittedBy) {
      const existingCount = await this.formResponseRepository.countByUserForForm(
        submittedBy,
        formDefinitionId,
      );

      if (existingCount > 0) {
        throw new BadRequestException(
          'Multiple submissions are not allowed for this form',
        );
      }
    }

    // Check max submissions per user
    if (form.maxSubmissionsPerUser && submittedBy) {
      const existingCount = await this.formResponseRepository.countByUserForForm(
        submittedBy,
        formDefinitionId,
      );

      if (existingCount >= form.maxSubmissionsPerUser) {
        throw new BadRequestException(
          `Maximum submissions (${form.maxSubmissionsPerUser}) reached for this form`,
        );
      }
    }

    // Validate response data against form schema
    this.formValidationService.validateResponseData(form.formSchema, responseData);

    const response = this.formResponseRepository.create({
      formDefinitionId,
      responseData,
      status: FormResponseStatus.SUBMITTED,
      isAnonymous,
      submittedBy: isAnonymous ? null : submittedBy,
      anonymousIdentifier: isAnonymous ? anonymousIdentifier : null,
      submittedAt: new Date(),
      ipAddress,
      userAgent,
    });

    const saved = await this.formResponseRepository.save(response);

    this.logger.log(
      `Submitted form response: ${saved.id} for form ${formDefinitionId}`,
    );

    // TODO: Trigger workflow if workflowId is set
    // TODO: Send notifications if notificationConfig is set

    return saved;
  }

  /**
   * Get form responses
   */
  async getFormResponses(
    formDefinitionId: number,
    includeInactive = false,
  ): Promise<FormResponse[]> {
    const form = await this.formDefinitionRepository.findById(formDefinitionId);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${formDefinitionId} not found`);
    }

    return this.formResponseRepository.findByFormDefinition(
      formDefinitionId,
      includeInactive,
    );
  }

  /**
   * Get form response by ID
   */
  async getFormResponseById(id: number): Promise<FormResponse> {
    const response = await this.formResponseRepository.findById(id);

    if (!response) {
      throw new NotFoundException(`Form response with ID ${id} not found`);
    }

    return response;
  }

  /**
   * Update form response status
   */
  async updateFormResponseStatus(
    id: number,
    status: FormResponseStatus,
    notes?: string,
    processedBy?: number,
  ): Promise<FormResponse> {
    const response = await this.formResponseRepository.findById(id);

    if (!response) {
      throw new NotFoundException(`Form response with ID ${id} not found`);
    }

    response.status = status;
    response.notes = notes || null;
    response.processedBy = processedBy || null;
    response.processedAt = new Date();

    const saved = await this.formResponseRepository.save(response);

    this.logger.log(`Updated form response status: ${id} -> ${status}`);

    return saved;
  }

  /**
   * Get form statistics
   */
  async getFormStatistics(
    formDefinitionId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const form = await this.formDefinitionRepository.findById(formDefinitionId);

    if (!form) {
      throw new NotFoundException(`Form definition with ID ${formDefinitionId} not found`);
    }

    const statistics = await this.formResponseRepository.getStatistics(
      formDefinitionId,
      startDate,
      endDate,
    );

    return {
      formId: formDefinitionId,
      formName: form.formName,
      totalResponses: statistics.total,
      byStatus: statistics.byStatus,
      anonymous: statistics.anonymous,
      authenticated: statistics.authenticated,
    };
  }

  /**
   * Get forms by organization
   */
  async getFormsByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<FormDefinition[]> {
    return this.formDefinitionRepository.findByOrganization(
      organizationId,
      includeInactive,
    );
  }

  /**
   * Get published forms
   */
  async getPublishedForms(organizationId?: number): Promise<FormDefinition[]> {
    return this.formDefinitionRepository.findPublished(organizationId);
  }

  /**
   * Get form templates
   */
  async getTemplates(organizationId?: number): Promise<FormDefinition[]> {
    return this.formDefinitionRepository.findTemplates(organizationId);
  }

  /**
   * Search forms
   */
  async searchForms(
    searchTerm?: string,
    status?: FormStatus,
    category?: string,
    accessType?: FormAccessType,
    organizationId?: number,
    includeInactive = false,
  ): Promise<FormDefinition[]> {
    return this.formDefinitionRepository.searchForms(
      searchTerm,
      status,
      category,
      accessType,
      organizationId,
      includeInactive,
    );
  }
}
