import { SetMetadata } from '@nestjs/common';
import { BYPASS_SUBSCRIPTION_KEY } from '../guards/subscription-active.guard';

/**
 * Bypass Subscription Decorator
 * 
 * Bypasses subscription validation for a route.
 * Use with caution - only for routes that don't require subscription validation.
 * 
 * Usage:
 * @UseGuards(SubscriptionActiveGuard)
 * @BypassSubscription()
 * @Get('public-feature')
 * publicHandler() { ... }
 */
export const BypassSubscription = () => SetMetadata(BYPASS_SUBSCRIPTION_KEY, true);


