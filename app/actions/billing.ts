"use server";

import { z } from "zod";
import { createSafeActionClient } from "next-safe-action";
import { getActivePaymentProvider } from "@/lib/payment/factory";
import { requireAuth } from "@/utils/auth";
import { prisma } from "@/lib/db/prisma";

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
        productId: process.env.PRODUCT_ID_CREDIT_PACK || "", // Should be configured in env
        description: `${totalCredits} Message Credits`,
        metadata: {
          organizationId,
          creditAmount: totalCredits.toString(),
          creditPurchase: "true",
          quantity: quantity.toString(),
        },
        returnUrl:
          returnUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${organizationId}/billing?tab=usage&success=true`,
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
        productId: process.env.PRODUCT_ID_CREDIT_PACK || "", // Should be configured in env
        description: `${creditAmount} Message Credits`,
        metadata: {
          organizationId,
          creditAmount: creditAmount.toString(),
          creditPurchase: "true",
        },
        returnUrl:
          returnUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${organizationId}/billing?tab=usage&success=true`,
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
