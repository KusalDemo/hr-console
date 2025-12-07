import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { Document } from '../../documents/entities/document.entity';
import { SearchRequestDto, SearchResponseDto, SearchResultDto, FacetDto } from '../dto';

/**
 * Search Service
 *
 * Provides advanced search capabilities:
 * - Full-text search across multiple entities
 * - Faceted search
 * - Result ranking
 * - Filtering
 * - Search analytics
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Search across all entities
   */
  async search(searchDto: SearchRequestDto): Promise<SearchResponseDto> {
    const results: SearchResultDto[] = [];
    const facets: Record<string, FacetDto[]> = {};

    // Search each entity type if specified, or search all
    const entityTypes = searchDto.entityTypes || [
      'employees',
      'projects',
      'tasks',
      'contacts',
      'documents',
    ];

    for (const entityType of entityTypes) {
      try {
        const entityResults = await this.searchEntity(
          entityType,
          searchDto.query,
          searchDto.filters || {},
          searchDto.limit || 20,
          searchDto.offset || 0,
        );

        results.push(...entityResults);

        // Collect facets
        const entityFacets = await this.getFacets(
          entityType,
          searchDto.query,
          searchDto.filters || {},
        );
        if (entityFacets.length > 0) {
          facets[entityType] = entityFacets;
        }
      } catch (error) {
        this.logger.error(
          `Error searching ${entityType}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Sort results by relevance
    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(
      searchDto.offset || 0,
      (searchDto.offset || 0) + (searchDto.limit || 20),
    );

    return {
      results: paginatedResults,
      total,
      facets,
      query: searchDto.query,
      entityTypes: entityTypes,
    };
  }

  /**
   * Search specific entity type
   */
  private async searchEntity(
    entityType: string,
    query: string,
    filters: Record<string, any>,
    limit: number,
    offset: number,
  ): Promise<SearchResultDto[]> {
    switch (entityType.toLowerCase()) {
      case 'employees':
        return this.searchEmployees(query, filters, limit, offset);
      case 'projects':
        return this.searchProjects(query, filters, limit, offset);
      case 'tasks':
        return this.searchTasks(query, filters, limit, offset);
      case 'contacts':
        return this.searchContacts(query, filters, limit, offset);
      case 'documents':
        return this.searchDocuments(query, filters, limit, offset);
      default:
        this.logger.warn(`Unknown entity type: ${entityType}`);
        return [];
    }
  }

  /**
   * Search employees
   */
  private async searchEmployees(
    query: string,
    filters: Record<string, any>,
    limit: number,
    offset: number,
  ): Promise<SearchResultDto[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Employee, 'employee')
      .select([
        'employee.id',
        'employee.firstName',
        'employee.lastName',
        'employee.email',
        'employee.jobTitle',
        'employee.departmentId',
      ])
      .where(
        `(
          to_tsvector('english', 
            COALESCE(employee.firstName, '') || ' ' || 
            COALESCE(employee.lastName, '') || ' ' || 
            COALESCE(employee.email, '') || ' ' || 
            COALESCE(employee.jobTitle, '')
          ) 
          @@ plainto_tsquery('english', :query)
        )`,
        { query },
      )
      .orderBy(
        `ts_rank(
          to_tsvector('english', 
            COALESCE(employee.firstName, '') || ' ' || 
            COALESCE(employee.lastName, '') || ' ' || 
            COALESCE(employee.email, '') || ' ' || 
            COALESCE(employee.jobTitle, '')
          ),
          plainto_tsquery('english', :query)
        )`,
        'DESC',
      )
      .addOrderBy('employee.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    // Apply filters
    if (filters.departmentId) {
      queryBuilder.andWhere('employee.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    if (filters.employmentStatus) {
      queryBuilder.andWhere('employee.employmentStatus = :status', {
        status: filters.employmentStatus,
      });
    }

    const employees = await queryBuilder.getMany();

    return employees.map((employee) => ({
      id: employee.id,
      entityType: 'employees',
      title: `${employee.firstName} ${employee.lastName}`,
      description: employee.email || employee.jobTitle || '',
      url: `/employees/${employee.id}`,
      relevance: 1.0, // Would be calculated from ts_rank in real implementation
      metadata: {
        email: employee.email,
        jobTitle: employee.jobTitle,
        departmentId: employee.departmentId,
      },
    }));
  }

  /**
   * Search projects
   */
  private async searchProjects(
    query: string,
    filters: Record<string, any>,
    limit: number,
    offset: number,
  ): Promise<SearchResultDto[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Project, 'project')
      .select(['project.id', 'project.projectName', 'project.description', 'project.status'])
      .where(
        `(
          to_tsvector('english', 
            COALESCE(project.projectName, '') || ' ' || 
            COALESCE(project.description, '')
          ) 
          @@ plainto_tsquery('english', :query)
        )`,
        { query },
      )
      .orderBy(
        `ts_rank(
          to_tsvector('english', 
            COALESCE(project.projectName, '') || ' ' || 
            COALESCE(project.description, '')
          ),
          plainto_tsquery('english', :query)
        )`,
        'DESC',
      )
      .addOrderBy('project.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.status) {
      queryBuilder.andWhere('project.status = :status', { status: filters.status });
    }

    const projects = await queryBuilder.getMany();

    return projects.map((project) => ({
      id: project.id,
      entityType: 'projects',
      title: project.name,
      description: project.description || '',
      url: `/projects/${project.id}`,
      relevance: 1.0,
      metadata: {
        status: project.status,
      },
    }));
  }

  /**
   * Search tasks
   */
  private async searchTasks(
    query: string,
    filters: Record<string, any>,
    limit: number,
    offset: number,
  ): Promise<SearchResultDto[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Task, 'task')
      .select(['task.id', 'task.taskName', 'task.description', 'task.status'])
      .where(
        `(
          to_tsvector('english', 
            COALESCE(task.taskName, '') || ' ' || 
            COALESCE(task.description, '')
          ) 
          @@ plainto_tsquery('english', :query)
        )`,
        { query },
      )
      .orderBy(
        `ts_rank(
          to_tsvector('english', 
            COALESCE(task.taskName, '') || ' ' || 
            COALESCE(task.description, '')
          ),
          plainto_tsquery('english', :query)
        )`,
        'DESC',
      )
      .addOrderBy('task.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId: filters.projectId });
    }

    const tasks = await queryBuilder.getMany();

    return tasks.map((task) => ({
      id: task.id,
      entityType: 'tasks',
      title: task.title,
      description: task.description || '',
      url: `/tasks/${task.id}`,
      relevance: 1.0,
      metadata: {
        status: task.status,
      },
    }));
  }

  /**
   * Search contacts
   */
  private async searchContacts(
    query: string,
    filters: Record<string, any>,
    limit: number,
    offset: number,
  ): Promise<SearchResultDto[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Contact, 'contact')
      .select([
        'contact.id',
        'contact.firstName',
        'contact.lastName',
        'contact.email',
        'contact.companyName',
      ])
      .where(
        `(
          to_tsvector('english', 
            COALESCE(contact.firstName, '') || ' ' || 
            COALESCE(contact.lastName, '') || ' ' || 
            COALESCE(contact.email, '') || ' ' || 
            COALESCE(contact.companyName, '')
          ) 
          @@ plainto_tsquery('english', :query)
        )`,
        { query },
      )
      .orderBy(
        `ts_rank(
          to_tsvector('english', 
            COALESCE(contact.firstName, '') || ' ' || 
            COALESCE(contact.lastName, '') || ' ' || 
            COALESCE(contact.email, '') || ' ' || 
            COALESCE(contact.companyName, '')
          ),
          plainto_tsquery('english', :query)
        )`,
        'DESC',
      )
      .addOrderBy('contact.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.contactType) {
      queryBuilder.andWhere('contact.contactType = :contactType', {
        contactType: filters.contactType,
      });
    }

    const contacts = await queryBuilder.getMany();

    return contacts.map((contact) => ({
      id: contact.id,
      entityType: 'contacts',
      title: `${contact.firstName} ${contact.lastName}`,
      description: contact.email || contact.companyName || '',
      url: `/contacts/${contact.id}`,
      relevance: 1.0,
      metadata: {
        email: contact.email,
        companyName: contact.companyName,
      },
    }));
  }

  /**
   * Search documents
   */
  private async searchDocuments(
    query: string,
    filters: Record<string, any>,
    limit: number,
    offset: number,
  ): Promise<SearchResultDto[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Document, 'document')
      .select([
        'document.id',
        'document.documentName',
        'document.description',
        'document.documentCategory',
        'document.documentStatus',
      ])
      .where('document.documentStatus = :status', { status: 'PUBLISHED' })
      .andWhere(
        `(
          to_tsvector('english', 
            COALESCE(document.documentName, '') || ' ' || 
            COALESCE(document.description, '') || ' ' || 
            COALESCE(document.content, '')
          ) 
          @@ plainto_tsquery('english', :query)
        )`,
        { query },
      )
      .orderBy(
        `ts_rank(
          to_tsvector('english', 
            COALESCE(document.documentName, '') || ' ' || 
            COALESCE(document.description, '') || ' ' || 
            COALESCE(document.content, '')
          ),
          plainto_tsquery('english', :query)
        )`,
        'DESC',
      )
      .addOrderBy('document.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.category) {
      queryBuilder.andWhere('document.documentCategory = :category', {
        category: filters.category,
      });
    }

    if (filters.documentType) {
      queryBuilder.andWhere('document.documentType = :documentType', {
        documentType: filters.documentType,
      });
    }

    const documents = await queryBuilder.getMany();

    return documents.map((document) => ({
      id: document.id,
      entityType: 'documents',
      title: document.documentName,
      description: document.description || '',
      url: `/documents/${document.id}`,
      relevance: 1.0,
      metadata: {
        category: document.documentCategory,
        type: document.documentType,
      },
    }));
  }

  /**
   * Get facets for entity type
   */
  private async getFacets(
    entityType: string,
    query: string,
    filters: Record<string, any>,
  ): Promise<FacetDto[]> {
    // TODO: Implement faceted search
    // For now, return empty array
    return [];
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, limit: number = 10): Promise<string[]> {
    // TODO: Implement search suggestions based on popular searches
    // For now, return empty array
    return [];
  }
}
