import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FormDefinition, FormStatus, FormAccessType } from '../entities/form-definition.entity';

/**
 * Form Definition Repository
 * 
 * Custom repository methods for form definition queries.
 */
@Injectable()
export class FormDefinitionRepository extends Repository<FormDefinition> {
  constructor(private dataSource: DataSource) {
    super(FormDefinition, dataSource.createEntityManager());
  }

  /**
   * Find form definition by ID
   */
  async findById(id: number, includeResponses = false): Promise<FormDefinition | null> {
    const query = this.createQueryBuilder('form')
      .where('form.id = :id', { id });

    if (includeResponses) {
      query.leftJoinAndSelect('form.responses', 'responses');
    }

    return query.getOne();
  }

  /**
   * Find forms by organization
   */
  async findByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<FormDefinition[]> {
    const query = this.createQueryBuilder('form')
      .where('form.organizationId = :organizationId', { organizationId })
      .orderBy('form.formName', 'ASC');

    if (!includeInactive) {
      query.andWhere('form.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find forms by status
   */
  async findByStatus(
    status: FormStatus,
    organizationId?: number,
  ): Promise<FormDefinition[]> {
    const query = this.createQueryBuilder('form')
      .where('form.status = :status', { status })
      .andWhere('form.isActive = :isActive', { isActive: true })
      .orderBy('form.formName', 'ASC');

    if (organizationId) {
      query.andWhere('form.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find published forms
   */
  async findPublished(
    organizationId?: number,
  ): Promise<FormDefinition[]> {
    const query = this.createQueryBuilder('form')
      .where('form.status = :status', { status: FormStatus.PUBLISHED })
      .andWhere('form.isActive = :isActive', { isActive: true })
      .orderBy('form.formName', 'ASC');

    if (organizationId) {
      query.andWhere('form.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find form templates
   */
  async findTemplates(
    organizationId?: number,
  ): Promise<FormDefinition[]> {
    const query = this.createQueryBuilder('form')
      .where('form.isTemplate = :isTemplate', { isTemplate: true })
      .andWhere('form.isActive = :isActive', { isActive: true })
      .orderBy('form.formName', 'ASC');

    if (organizationId) {
      query.andWhere('form.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find forms by category
   */
  async findByCategory(
    category: string,
    organizationId?: number,
  ): Promise<FormDefinition[]> {
    const query = this.createQueryBuilder('form')
      .where('form.category = :category', { category })
      .andWhere('form.isActive = :isActive', { isActive: true })
      .orderBy('form.formName', 'ASC');

    if (organizationId) {
      query.andWhere('form.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find forms by access type
   */
  async findByAccessType(
    accessType: FormAccessType,
    organizationId?: number,
  ): Promise<FormDefinition[]> {
    const query = this.createQueryBuilder('form')
      .where('form.accessType = :accessType', { accessType })
      .andWhere('form.isActive = :isActive', { isActive: true })
      .orderBy('form.formName', 'ASC');

    if (organizationId) {
      query.andWhere('form.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find forms by workflow
   */
  async findByWorkflow(workflowId: number): Promise<FormDefinition[]> {
    return this.createQueryBuilder('form')
      .where('form.workflowId = :workflowId', { workflowId })
      .andWhere('form.isActive = :isActive', { isActive: true })
      .orderBy('form.formName', 'ASC')
      .getMany();
  }

  /**
   * Find form versions
   */
  async findVersions(
    parentFormId: number,
  ): Promise<FormDefinition[]> {
    return this.createQueryBuilder('form')
      .where('form.parentFormId = :parentFormId', { parentFormId })
      .orWhere('form.id = :parentFormId', { parentFormId })
      .orderBy('form.formVersion', 'DESC')
      .getMany();
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
    const query = this.createQueryBuilder('form')
      .orderBy('form.formName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          form.formName ILIKE :searchTerm OR
          form.formDescription ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (status) {
      query.andWhere('form.status = :status', { status });
    }

    if (category) {
      query.andWhere('form.category = :category', { category });
    }

    if (accessType) {
      query.andWhere('form.accessType = :accessType', { accessType });
    }

    if (organizationId) {
      query.andWhere('form.organizationId = :organizationId', { organizationId });
    }

    if (!includeInactive) {
      query.andWhere('form.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }
}
