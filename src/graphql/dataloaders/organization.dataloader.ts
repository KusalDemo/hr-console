import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { In } from 'typeorm';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Organization DataLoader
 * 
 * Batch loads organizations by ID to prevent N+1 queries.
 * Caches results per request.
 */
@Injectable({ scope: Scope.REQUEST })
export class OrganizationDataLoader {
  private readonly loader: DataLoader<number, Organization | null>;

  constructor(private readonly organizationRepository: OrganizationRepository) {
    this.loader = new DataLoader<number, Organization | null>(
      async (ids: readonly number[]): Promise<(Organization | null)[]> => {
        // Batch load all organizations using TypeORM's In operator
        const organizations = await this.organizationRepository.find({
          where: { id: In([...ids]) },
        });
        
        // Create a map for quick lookup
        const organizationMap = new Map<number, Organization>();
        organizations.forEach((organization) => {
          organizationMap.set(organization.id, organization);
        });
        
        // Return organizations in the same order as requested IDs
        return ids.map((id) => organizationMap.get(id) || null);
      },
      {
        // Cache results for the duration of the request
        cache: true,
      },
    );
  }

  /**
   * Load a single organization by ID
   */
  async load(id: number): Promise<Organization | null> {
    return this.loader.load(id);
  }

  /**
   * Load multiple organizations by IDs
   */
  async loadMany(ids: number[]): Promise<(Organization | null)[]> {
    return this.loader.loadMany(ids);
  }
}
