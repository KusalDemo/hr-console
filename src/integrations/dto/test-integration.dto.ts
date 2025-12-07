import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum TestType {
  CONNECTION = 'CONNECTION',
  OAUTH2 = 'OAUTH2',
  API_KEY = 'API_KEY',
  WEBHOOK = 'WEBHOOK',
}

export class TestIntegrationDto {
  @IsOptional()
  @IsEnum(TestType)
  testType?: TestType;
}
