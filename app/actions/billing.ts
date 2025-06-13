"use server";

import { z } from "zod";
import { createSafeActionClient } from "next-safe-action";
import { getActivePaymentProvider } from "@/lib/payment/factory";
import { requireAuth } from "@/utils/auth";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/src/env";
import {
  updateOrganizationSubscription,
  cancelOrganizationSubscription,
  activateOrganizationSubscription,
} from "@/lib/payment/billing-service";
import { BillingCycle } from "@/lib/payment/types";
import { getDowngradeImpact } from "@/lib/payment/bot-limit-service";
import { PlanType } from "@/lib/generated/prisma";

// Create safe action client
const action = createSafeActionClient();

// Schema for purchasing credit packs
const purchaseCreditPackSchema = z.object({
  organizationId: z.string(),
  quantity: z.number().int().positive().default(1),
  customerEmail: z.string().email().optional(),
  returnUrl: z.string().url().optional(),
});

/**
 * Server action to purchase a credit pack using one-time payment
 */
export const purchaseCreditPack = action
  .schema(purchaseCreditPackSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { organizationId, quantity, customerEmail, returnUrl } =
        parsedInput;

      // Check authentication
      const user = await requireAuth();

      // Get the organization to confirm it exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Organization not found",
          },
        };
      }

      // Get the user details for customer information
      const userDetails = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // Get payment customer for the organization if it exists
      const paymentCustomer = await prisma.paymentCustomer.findFirst({
        where: {
          organizationId,
          provider: "dodo",
        },
      });

      // Calculate credit amount based on quantity (1000 credits per pack)
      const creditsPerPack = 1000;
      const totalCredits = creditsPerPack * quantity;

      // Calculate price (15 per pack)
      const pricePerPack = 15;
      const amount = pricePerPack * quantity;

      // Create a payment link using the payment provider
      const paymentProvider = getActivePaymentProvider();

      const result = await paymentProvider.createPaymentLink({
        amount,
        currency: "USD",
        customer: {
          customerId: paymentCustomer?.customerId,
          email: customerEmail || userDetails?.email || "",
          name:
            userDetails?.firstName && userDetails.lastName
              ? `${userDetails.firstName} ${userDetails.lastName}`
              : userDetails?.email || "",
        },
        billingAddress: {
          street: "123 Main St", // Default values - should be updated in production
          city: "New York",
          state: "NY",
          country: "US",
          zipcode: "10001",
        },
        productId: env.PRODUCT_ID_CREDIT_PACK,
        description: `${totalCredits} Message Credits`,
        metadata: {
          organizationId,
          creditAmount: totalCredits.toString(),
          creditPurchase: "true",
          quantity: quantity.toString(),
        },
        returnUrl:
          returnUrl ||
          `${env.NEXT_PUBLIC_APP_URL}/dashboard/${organizationId}/billing?tab=usage&success=true`,
      });

      return {
        success: true,
        data: {
          paymentLinkUrl: result.paymentLinkUrl,
          paymentId: result.paymentId,
          quantity,
          totalCredits,
          amount,
        },
      };
    } catch (error) {
      console.error("Error creating payment for credit pack:", error);

      return {
        success: false,
        error: {
          code: "PAYMENT_LINK_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create payment link",
        },
      };
    }
  });

// Schema for one-time payment for credits
const purchaseCreditsWithPaymentSchema = z.object({
  organizationId: z.string(),
  creditAmount: z.number().int().positive(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  returnUrl: z.string().url().optional(),
});

/**
 * Server action to create a payment link for credit purchase
 * This is useful for one-time purchases without requiring a subscription
 */
export const purchaseCreditsWithPayment = action
  .schema(purchaseCreditsWithPaymentSchema)
  .action(async ({ parsedInput }) => {
    try {
      const {
        organizationId,
        creditAmount,
        customerEmail,
        customerName,
        returnUrl,
      } = parsedInput;

      // Check authentication
      const user = await requireAuth();

      // Get the organization to confirm it exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Organization not found",
          },
        };
      }

      // Get default user details if not provided
      const userDetails = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // Calculate price (example: 1 credit = $0.015)
      const pricePerCredit = 0.015;
      const amount = creditAmount * pricePerCredit;

      // Create a payment link using the payment provider
      const paymentProvider = getActivePaymentProvider();

      const result = await paymentProvider.createPaymentLink({
        amount,
        currency: "USD",
        customer: {
          email: customerEmail || userDetails?.email || "",
          name:
            customerName ||
            (userDetails?.firstName && userDetails.lastName
              ? `${userDetails.firstName} ${userDetails.lastName}`
              : userDetails?.email || ""),
        },
        billingAddress: {
          street: "123 Main St", // Default values - should be updated in production
          city: "New York",
          state: "NY",
          country: "US",
          zipcode: "10001",
        },
        productId: env.PRODUCT_ID_CREDIT_PACK,
        description: `${creditAmount} Message Credits`,
        metadata: {
          organizationId,
          creditAmount: creditAmount.toString(),
          creditPurchase: "true",
        },
        returnUrl:
          returnUrl ||
          `${env.NEXT_PUBLIC_APP_URL}/dashboard/${organizationId}/billing?tab=usage&success=true`,
      });

      return {
        success: true,
        data: {
          paymentLinkUrl: result.paymentLinkUrl,
          paymentId: result.paymentId,
        },
      };
    } catch (error) {
      console.error("Error creating payment link for credits:", error);

      return {
        success: false,
        error: {
          code: "PAYMENT_LINK_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create payment link",
        },
      };
    }
  });

// Schema for updating subscription
const updateSubscriptionSchema = z.object({
  organizationId: z.string(),
  planType: z.string(),
  billingCycle: z.enum([BillingCycle.MONTHLY, BillingCycle.YEARLY]),
});

/**
 * Server action to update a subscription
 */
export const updateSubscription = action
  .schema(updateSubscriptionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { organizationId, planType, billingCycle } = parsedInput;

      // Check authentication
      await requireAuth();

      // Get current subscription to check if it's a trial without externalId
      const currentSubscription = await prisma.subscription.findUnique({
        where: { organizationId },
      });

      // Log info about the subscription update attempt
      console.log(`Updating subscription for org ${organizationId}:`, {
        planType,
        billingCycle,
        currentSubscription: {
          id: currentSubscription?.id,
          status: currentSubscription?.status,
          hasExternalId: !!currentSubscription?.externalId,
        },
      });

      // Map the billing cycle string to enum
      const cycle = billingCycle;

      // Update the subscription
      const result = await updateOrganizationSubscription(organizationId, {
        planType,
        billingCycle: cycle,
      });

      // If this was a trial-to-paid conversion, log the success
      if (currentSubscription && !currentSubscription.externalId) {
        console.log(`Successfully converted trial subscription to paid plan:`, {
          organizationId,
          subscriptionId: result.subscriptionId,
          previousStatus: currentSubscription.status,
          newStatus: result.status,
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("Error updating subscription:", error);

      return {
        success: false,
        error: {
          code: "SUBSCRIPTION_UPDATE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update subscription",
        },
      };
    }
  });

// Schema for canceling subscription
const cancelSubscriptionSchema = z.object({
  organizationId: z.string(),
  atPeriodEnd: z.boolean().default(true),
});

/**
 * Server action to cancel a subscription
 */
export const cancelSubscription = action
  .schema(cancelSubscriptionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { organizationId, atPeriodEnd } = parsedInput;

      // Check authentication
      await requireAuth();

      // Cancel the subscription
      const result = await cancelOrganizationSubscription(
        organizationId,
        atPeriodEnd
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("Error canceling subscription:", error);

      return {
        success: false,
        error: {
          code: "SUBSCRIPTION_CANCEL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to cancel subscription",
        },
      };
    }
  });

// Schema for reactivating subscription
const reactivateSubscriptionSchema = z.object({
  organizationId: z.string(),
  returnUrl: z.string().url().optional(),
});

/**
 * Server action to reactivate a subscription
 */
export const reactivateSubscription = action
  .schema(reactivateSubscriptionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { organizationId, returnUrl } = parsedInput;

      // Check authentication
      await requireAuth();

      // Reactivate the subscription
      const result = await activateOrganizationSubscription(
        organizationId,
        returnUrl
      );

      // Check if we received a payment link
      // If yes, return it so the client can redirect the user
      if (result.paymentLinkUrl) {
        return {
          success: true,
          data: {
            ...result,
            requiresPayment: true,
          },
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("Error reactivating subscription:", error);

      return {
        success: false,
        error: {
          code: "SUBSCRIPTION_REACTIVATE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to reactivate subscription",
        },
      };
    }
  });

// Schema for checking downgrade impact
const checkDowngradeImpactSchema = z.object({
  organizationId: z.string(),
  targetPlanType: z.nativeEnum(PlanType),
});

/**
 * Server action to check what would happen if a plan is downgraded
 */
export const checkDowngradeImpact = action
  .schema(checkDowngradeImpactSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { organizationId, targetPlanType } = parsedInput;

      // Check authentication
      await requireAuth();

      // Get the downgrade impact
      const impact = await getDowngradeImpact(organizationId, targetPlanType);

      return {
        success: true,
        data: impact,
      };
    } catch (error) {
      console.error("Error checking downgrade impact:", error);

      return {
        success: false,
        error: {
          code: "DOWNGRADE_CHECK_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to check downgrade impact",
        },
      };
    }
  });
