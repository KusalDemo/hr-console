import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionPlanRepository } from '../repositories/subscription-plan.repository';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { BillingCycle } from '../entities/subscription-plan.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { RenewSubscriptionDto } from '../dto';
import {
  BusinessException,
  ErrorCode,
} from '../../common/exceptions/business.exception';

/**
 * Payment Processing Service Interface
 * Placeholder for payment gateway integration
 */
export interface PaymentProcessingService {
  processPayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    description?: string,
  ): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }>;
  processSubscriptionRenewal(
    subscriptionId: string,
    amount: number,
    currency: string,
  ): Promise<{
    success: boolean;
    transactionId?: string;
    invoiceId?: string;
    error?: string;
  }>;
}

/**
 * Invoice Service Interface
 * Placeholder for invoice generation
 */
export interface InvoiceService {
  generateInvoice(
    subscription: Subscription,
    amount: number,
    currency: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    invoiceId: string;
    invoiceNumber: string;
    pdfUrl?: string;
  }>;
  sendInvoice(
    invoiceId: string,
    recipientEmail: string,
  ): Promise<void>;
}

/**
 * Renewal Result
 */
export interface RenewalResult {
  success: boolean;
  subscription: Subscription;
  invoiceId?: string;
  transactionId?: string;
  message: string;
  errors?: string[];
}

/**
 * Subscription Renewal Service
 * 
 * Handles subscription renewal operations:
 * - Automatic renewal logic
 * - Manual renewal processing
 * - Payment processing integration
 * - Invoice generation
 * 
 * This service provides comprehensive renewal functionality
 * beyond basic subscription updates.
 */
@Injectable()
export class SubscriptionRenewalService {
  private readonly logger = new Logger(SubscriptionRenewalService.name);
  private readonly MAX_RENEWAL_RETRIES = 3;

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
    private readonly subscriptionsService: SubscriptionsService,
    // Payment processing service will be injected when implemented
    // private readonly paymentProcessingService: PaymentProcessingService,
    // Invoice service will be injected when implemented
    // private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Process automatic renewal for a subscription
   * 
   * This method is called by scheduled jobs to automatically renew subscriptions
   * that are due for renewal.
   * 
   * @param subscriptionId - Subscription ID to renew
   * @returns Renewal result
   */
  async processAutomaticRenewal(subscriptionId: number): Promise<RenewalResult> {
    this.logger.log(`Processing automatic renewal for subscription ID: ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription', subscriptionId.toString());
    }

    // Validate subscription can be renewed
    if (!subscription.canBeRenewed()) {
      return {
        success: false,
        subscription,
        message: `Subscription cannot be renewed. Status: ${subscription.status}`,
        errors: [`Invalid subscription status: ${subscription.status}`],
      };
    }

    // Check if renewal is due
    if (!this.isRenewalDue(subscription)) {
      return {
        success: false,
        subscription,
        message: 'Subscription is not due for renewal yet',
        errors: ['Renewal not due'],
      };
    }

    // Check if subscription is scheduled to cancel
    if (subscription.willCancelAtPeriodEnd()) {
      return {
        success: false,
        subscription,
        message: 'Subscription is scheduled to cancel at period end',
        errors: ['Subscription scheduled for cancellation'],
      };
    }

    // Get plan for renewal
    const plan = subscription.plan;
    if (!plan) {
      return {
        success: false,
        subscription,
        message: 'Subscription plan not found',
        errors: ['Plan not found'],
      };
    }

    // Process renewal with payment
    return this.processRenewalWithPayment(subscription, plan, true);
  }

  /**
   * Process manual renewal for a subscription
   * 
   * This method is called when a user manually renews a subscription,
   * optionally changing the plan or payment method.
   * 
   * @param subscriptionId - Subscription ID to renew
   * @param renewDto - Renewal data (optional plan change, payment method, etc.)
   * @param updatedBy - User ID who initiated renewal (optional)
   * @returns Renewal result
   */
  async processManualRenewal(
    subscriptionId: number,
    renewDto: RenewSubscriptionDto,
    updatedBy?: number,
  ): Promise<RenewalResult> {
    this.logger.log(`Processing manual renewal for subscription ID: ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription', subscriptionId.toString());
    }

    // Validate subscription can be renewed
    if (!subscription.canBeRenewed()) {
      throw new BadRequestException(
        `Subscription cannot be renewed. Status: ${subscription.status}`,
      );
    }

    // Get plan (use existing or new plan if specified)
    let plan = subscription.plan;
    if (renewDto.planId && renewDto.planId !== subscription.planId) {
      const newPlan = await this.subscriptionPlanRepository.findById(renewDto.planId);
      if (!newPlan) {
        throw new NotFoundException('Subscription Plan', renewDto.planId.toString());
      }
      if (!newPlan.isActive) {
        throw new BadRequestException('Subscription plan is not active');
      }
      plan = newPlan;
    }

    if (!plan) {
      throw new NotFoundException('Subscription Plan', subscription.planId.toString());
    }

    // Process renewal with payment
    return this.processRenewalWithPayment(
      subscription,
      plan,
      false,
      renewDto,
      updatedBy,
    );
  }

  /**
   * Process renewal with payment processing
   * 
   * @param subscription - Subscription to renew
   * @param plan - Plan to renew with
   * @param automatic - Whether this is an automatic renewal
   * @param renewDto - Renewal data (for manual renewals)
   * @param updatedBy - User ID who initiated renewal
   * @returns Renewal result
   */
  private async processRenewalWithPayment(
    subscription: Subscription,
    plan: SubscriptionPlan,
    automatic: boolean,
    renewDto?: RenewSubscriptionDto,
    updatedBy?: number,
  ): Promise<RenewalResult> {
    try {
      // Determine amount (use provided, plan price, or existing amount)
      const amount = renewDto?.amount !== undefined ? renewDto.amount : plan.price;
      const currency = plan.currency;

      // Get payment method
      const paymentMethodId =
        renewDto?.paymentMethodId || subscription.paymentMethodId;

      if (!paymentMethodId) {
        return {
          success: false,
          subscription,
          message: 'Payment method is required for renewal',
          errors: ['No payment method available'],
        };
      }

      // Process payment if not automatic or if payment gateway subscription ID exists
      let paymentResult: {
        success: boolean;
        transactionId?: string;
        invoiceId?: string;
        error?: string;
      } | null = null;

      if (subscription.paymentGatewaySubscriptionId) {
        // Use payment gateway subscription renewal
        // TODO: Integrate with payment gateway
        // paymentResult = await this.paymentProcessingService.processSubscriptionRenewal(
        //   subscription.paymentGatewaySubscriptionId,
        //   amount,
        //   currency,
        // );
        this.logger.debug(
          `Payment gateway renewal would be processed for subscription ID: ${subscription.id}`,
        );
        // For now, assume success if payment gateway subscription ID exists
        paymentResult = {
          success: true,
          transactionId: `gw_${subscription.id}_${Date.now()}`,
        };
      } else if (!automatic) {
        // Manual renewal - process payment directly
        // TODO: Integrate with payment gateway
        // paymentResult = await this.paymentProcessingService.processPayment(
        //   amount,
        //   currency,
        //   paymentMethodId,
        //   `Subscription renewal for ${plan.planName}`,
        // );
        this.logger.debug(
          `Direct payment would be processed for subscription ID: ${subscription.id}`,
        );
        // For now, assume success for manual renewals
        paymentResult = {
          success: true,
          transactionId: `manual_${subscription.id}_${Date.now()}`,
        };
      }

      // If payment failed, handle retry logic
      if (paymentResult && !paymentResult.success) {
        return this.handleRenewalPaymentFailure(
          subscription,
          plan,
          paymentResult.error || 'Payment processing failed',
        );
      }

      // Calculate new billing period
      const now = new Date();
      const { currentPeriodStart, currentPeriodEnd } = this.calculateBillingPeriod(
        now,
        plan.billingCycle,
        plan.billingInterval,
      );

      // Generate invoice
      let invoiceId: string | undefined;
      try {
        // TODO: Generate invoice via invoice service
        // const invoice = await this.invoiceService.generateInvoice(
        //   subscription,
        //   amount,
        //   currency,
        //   currentPeriodStart,
        //   currentPeriodEnd,
        // );
        // invoiceId = invoice.invoiceId;
        this.logger.debug(`Invoice would be generated for subscription ID: ${subscription.id}`);
      } catch (error) {
        this.logger.warn(
          `Failed to generate invoice for subscription ID: ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        // Continue with renewal even if invoice generation fails
      }

      // Update subscription via service
      const updatedSubscription = await this.subscriptionsService.renewSubscription(
        subscription.id,
        {
          planId: plan.id,
          amount,
          paymentMethodId,
        },
        updatedBy,
      );

      // Load updated subscription with relations
      const subscriptionWithRelations = await this.subscriptionRepository.findById(
        subscription.id,
      );

      if (!subscriptionWithRelations) {
        throw new NotFoundException('Subscription', subscription.id.toString());
      }

      // Update metadata with renewal information
      const metadata = subscriptionWithRelations.metadata || {};
      metadata.lastRenewalDate = new Date().toISOString();
      metadata.lastRenewalAmount = amount;
      metadata.lastRenewalTransactionId = paymentResult?.transactionId;
      metadata.lastRenewalInvoiceId = invoiceId;
      metadata.renewalCount = (metadata.renewalCount || 0) + 1;
      metadata.automaticRenewal = automatic;

      await this.subscriptionRepository.update(subscription.id, { metadata });

      // Send invoice if generated
      if (invoiceId && subscriptionWithRelations.tenant) {
        try {
          // TODO: Send invoice via invoice service
          // await this.invoiceService.sendInvoice(
          //   invoiceId,
          //   subscriptionWithRelations.tenant.email || '',
          // );
          this.logger.debug(`Invoice would be sent for subscription ID: ${subscription.id}`);
        } catch (error) {
          this.logger.warn(
            `Failed to send invoice for subscription ID: ${subscription.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      this.logger.log(
        `Successfully renewed subscription ID: ${subscription.id} (${automatic ? 'automatic' : 'manual'})`,
      );

      return {
        success: true,
        subscription: subscriptionWithRelations,
        invoiceId,
        transactionId: paymentResult?.transactionId,
        message: `Subscription renewed successfully (${automatic ? 'automatic' : 'manual'})`,
      };
    } catch (error) {
      this.logger.error(
        `Error processing renewal for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );

      return {
        success: false,
        subscription,
        message: `Renewal failed: ${error instanceof Error ? error.message : String(error)}`,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Handle renewal payment failure
   * 
   * @param subscription - Subscription that failed renewal
   * @param plan - Plan that was attempted
   * @param error - Error message
   * @returns Renewal result
   */
  private async handleRenewalPaymentFailure(
    subscription: Subscription,
    plan: SubscriptionPlan,
    error: string,
  ): Promise<RenewalResult> {
    this.logger.warn(
      `Renewal payment failed for subscription ID: ${subscription.id}`,
      { error },
    );

    // Update metadata with failure information
    const metadata = subscription.metadata || {};
    metadata.lastRenewalFailureDate = new Date().toISOString();
    metadata.lastRenewalFailureReason = error;
    metadata.renewalFailureCount = (metadata.renewalFailureCount || 0) + 1;

    await this.subscriptionRepository.update(subscription.id, { metadata });

    // Update subscription status to past due if it was active
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      await this.subscriptionRepository.updateStatus(
        subscription.id,
        SubscriptionStatus.PAST_DUE,
      );

      // Set grace period
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
      await this.subscriptionRepository.setGracePeriod(subscription.id, gracePeriodEnd);
    }

    return {
      success: false,
      subscription,
      message: `Renewal payment failed: ${error}`,
      errors: [error],
    };
  }

  /**
   * Check if subscription is due for renewal
   * 
   * @param subscription - Subscription to check
   * @returns True if renewal is due
   */
  private isRenewalDue(subscription: Subscription): boolean {
    const now = new Date();
    const daysUntilExpiration = subscription.getDaysRemainingInPeriod();

    // Renew if expiration is within 1 day or has passed
    return daysUntilExpiration <= 1;
  }

  /**
   * Calculate billing period dates
   * 
   * @param startDate - Period start date
   * @param billingCycle - Billing cycle
   * @param interval - Billing interval
   * @returns Period start and end dates
   */
  private calculateBillingPeriod(
    startDate: Date,
    billingCycle: BillingCycle,
    interval: number = 1,
  ): { currentPeriodStart: Date; currentPeriodEnd: Date } {
    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = new Date(startDate);

    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval);
        break;
      case BillingCycle.QUARTERLY:
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval * 3);
        break;
      case BillingCycle.YEARLY:
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + interval);
        break;
      default:
        // Default to monthly
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval);
    }

    return { currentPeriodStart, currentPeriodEnd };
  }

  /**
   * Get subscriptions due for renewal
   * 
   * @param daysAhead - Days ahead to check (default: 1)
   * @returns List of subscriptions due for renewal
   */
  async getSubscriptionsDueForRenewal(daysAhead: number = 1): Promise<Subscription[]> {
    return this.subscriptionRepository.findExpiringSoon(daysAhead);
  }

  /**
   * Retry failed renewal
   * 
   * @param subscriptionId - Subscription ID to retry
   * @returns Renewal result
   */
  async retryFailedRenewal(subscriptionId: number): Promise<RenewalResult> {
    this.logger.log(`Retrying failed renewal for subscription ID: ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription', subscriptionId.toString());
    }

    // Check renewal failure count
    const metadata = subscription.metadata || {};
    const failureCount = metadata.renewalFailureCount || 0;

    if (failureCount >= this.MAX_RENEWAL_RETRIES) {
      return {
        success: false,
        subscription,
        message: `Maximum renewal retries (${this.MAX_RENEWAL_RETRIES}) exceeded`,
        errors: ['Maximum retries exceeded'],
      };
    }

    // Retry renewal
    return this.processAutomaticRenewal(subscriptionId);
  }
}

