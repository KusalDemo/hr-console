import { SetMetadata } from '@nestjs/common';
import { ALLOW_GRACE_PERIOD_KEY } from '../guards/subscription-active.guard';

/**
 * Allow Grace Period Decorator
 * 
 * Controls whether grace period access is allowed for subscription validation.
 * 
 * @param allow - Whether to allow grace period access (default: true)
 * 
 * Usage:
 * @UseGuards(SubscriptionActiveGuard)
 * @AllowGracePeriod(false) // Disallow grace period access
 * @Get('premium-feature')
 * premiumHandler() { ... }
 */
export const AllowGracePeriod = (allow: boolean = true) =>
  SetMetadata(ALLOW_GRACE_PERIOD_KEY, allow);


