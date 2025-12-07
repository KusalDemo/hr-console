import { IntegrationHealth } from '../entities';

export class IntegrationHealthResponseDto {
  id: number;
  integrationId: number;
  status: string;
  responseTimeMs: number | null;
  httpStatusCode: number | null;
  errorMessage: string | null;
  checkDetails: Record<string, any> | null;
  isSuccessful: boolean;
  createdAt: Date;

  static fromEntity(entity: IntegrationHealth): IntegrationHealthResponseDto {
    const dto = new IntegrationHealthResponseDto();
    dto.id = entity.id;
    dto.integrationId = entity.integrationId;
    dto.status = entity.status;
    dto.responseTimeMs = entity.responseTimeMs;
    dto.httpStatusCode = entity.httpStatusCode;
    dto.errorMessage = entity.errorMessage;
    dto.checkDetails = entity.checkDetails;
    dto.isSuccessful = entity.isSuccessful;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
