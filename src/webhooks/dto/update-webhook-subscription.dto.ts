import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookSubscriptionDto } from './create-webhook-subscription.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateWebhookSubscriptionDto extends PartialType(CreateWebhookSubscriptionDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
