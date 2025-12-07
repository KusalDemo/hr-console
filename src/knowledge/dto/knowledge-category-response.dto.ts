import { KnowledgeCategory } from '../entities/knowledge-category.entity';

/**
 * Knowledge Category Response DTO
 */
export class KnowledgeCategoryResponseDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  organizationId: number | null;
  displayOrder: number;
  isActive: boolean;
  icon: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: KnowledgeCategory): KnowledgeCategoryResponseDto {
    const dto = new KnowledgeCategoryResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.parentId = entity.parentId;
    dto.organizationId = entity.organizationId;
    dto.displayOrder = entity.displayOrder;
    dto.isActive = entity.isActive;
    dto.icon = entity.icon;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
