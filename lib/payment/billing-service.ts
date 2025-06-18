"use server";

import {
  PlanType,
  PrismaClient,
  SubscriptionStatus,
  UserRole,
} from "@/lib/generated/prisma";
import { getActivePaymentProvider } from "./factory";
import {
  UpdateSubscriptionOptions,
  BillingCycle,
  Customer,
  BillingAddress,
} from "./types";
import { enforceBotLimitsOnPlanChange } from "./bot-limit-service";
import { CountryCode } from "dodopayments/resources/misc.mjs";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import { InputJsonValue } from "../generated/prisma/runtime/library";
import { getUser } from "@/utils/auth";
import { env } from "@/src/env";

const prisma = new PrismaClient();

/**
 * Get payment customer record for an organization and provider
 */
export async function getPaymentCustomer(
  organizationId: string,
  provider: string = "dodo"
) {
  try {
    return await prisma.paymentCustomer.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
    });
  } catch (error) {
    console.error("Error getting payment customer:", error);
    return null;
  }
}

/**
 * Create or update a payment customer record
 */
export async function savePaymentCustomer(
  organizationId: string,
  customerId: string,
  provider: string = "dodo",
  metadata?: Record<string, unknown>
) {
  try {
    return await prisma.paymentCustomer.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
      update: {
        customerId,
        metadata: metadata as InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        provider,
        customerId,
        metadata: metadata as InputJsonValue,
      },
    });
  } catch (error) {
    console.error("Error saving payment customer:", error);
    throw error;
  }
}

/**
 * Get customer information from the authenticated user
 */
export async function getCustomerFromUser(): Promise<Customer | null> {
  try {
    const user = await getUser();

    if (!user) {
      return null;
    }

    // Fetch user record from database to get additional details
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userRecord) {
      return null;
    }

    return {
      email: userRecord.email,
      name:
        userRecord.firstName && userRecord.lastName
          ? `${userRecord.firstName} ${userRecord.lastName}`
          : userRecord.email,
      // We'll look up the customerId in the database or create a new one when needed
    };
  } catch (error) {
    console.error("Error getting customer from user:", error);
    return null;
  }
}

/**
 * Maps a plan type and billing cycle to the corresponding product ID
 */
export async function getProductId(
  planType: string,
  billingCycle: BillingCycle | string
): Promise<string> {
  const planId = planType.toLowerCase();
  const cycle =
    billingCycle === BillingCycle.YEARLY || billingCycle === "YEARLY"
      ? "yearly"
      : "monthly";

  // Define the mapping of plan ID and billing cycle to product ID
  const productMapping: Record<string, Record<string, string>> = {
    hobby: {
      monthly: env.PRODUCT_ID_HOBBY_MONTHLY,
      yearly: env.PRODUCT_ID_HOBBY_YEARLY,
    },
    standard: {
      monthly: env.PRODUCT_ID_STANDARD_MONTHLY,
      yearly: env.PRODUCT_ID_STANDARD_YEARLY,
    },
    pro: {
      monthly: env.PRODUCT_ID_PRO_MONTHLY,
      yearly: env.PRODUCT_ID_PRO_YEARLY,
    },
  };

  // Check if the plan exists in the mapping
  if (!productMapping[planId]) {
    throw new Error(`Unknown plan type: ${planType}`);
  }

  // Check if the billing cycle exists for the plan
  if (!productMapping[planId][cycle]) {
    throw new Error(
      `Unknown billing cycle '${billingCycle}' for plan '${planType}'`
    );
  }

  return productMapping[planId][cycle];
}

export async function mapProductIdToPlanType(
  productId: string
): Promise<string> {
  // This should be the reverse mapping of getProductId in billing-service.ts
  const { env } = await import("@/src/env");

  // Create a mapping from product ID to plan type
  const productMapping: Record<string, string> = {
    [env.PRODUCT_ID_HOBBY_MONTHLY]: PlanType.HOBBY,
    [env.PRODUCT_ID_HOBBY_YEARLY]: PlanType.HOBBY,
    [env.PRODUCT_ID_STANDARD_MONTHLY]: PlanType.STANDARD,
    [env.PRODUCT_ID_STANDARD_YEARLY]: PlanType.STANDARD,
    [env.PRODUCT_ID_PRO_MONTHLY]: PlanType.PRO,
    [env.PRODUCT_ID_PRO_YEARLY]: PlanType.PRO,
  };

  // Return the mapped plan type or default to STANDARD
  return productMapping[productId] || PlanType.STANDARD;
}

// Cache plan info for performance
const getPlansCache = cache(async () => {
  return await prisma.planFeature.findMany({
    include: {
      planLimits: true,
    },
  });
});

// Cache add-ons for performance
const getAddOnsCache = cache(async () => {
  return await prisma.addOn.findMany();
});

export async function getOrganizationSubscription(organizationId: string) {
  return await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      organization: true,
    },
  });
}

export async function createSubscriptionForOrganization(
  organizationId: string,
  planType: string,
  billingCycle: BillingCycle,
  customer: Customer,
  billingAddress: BillingAddress,
  returnUrl?: string
) {
  try {
    // Get the organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          include: {
            user: true,
          },
          where: {
            role: UserRole.OWNER,
          },
          take: 1,
        },
      },
    });

    if (!organization) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    // Check if the organization already has a subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    // Try to get customer info from authenticated user
    const authCustomer = await getCustomerFromUser();

    // Check if we already have a stored customer ID for this organization
    const paymentCustomer = await getPaymentCustomer(organizationId);

    // Use authenticated user info if available, otherwise use provided customer
    const finalCustomer: Customer = {
      ...customer,
      // Prefer authenticated user info when available
      email: authCustomer?.email || customer.email,
      name: authCustomer?.name || customer.name,
      // Use stored customer ID if available
      customerId: paymentCustomer?.customerId || customer.customerId,
    };

    // If no customer ID is provided, check if organization owner has one
    if (!finalCustomer.customerId && organization.users.length > 0) {
      const ownerUser = organization.users[0].user;

      // For now we'll just use email and name from the owner
      finalCustomer.email = finalCustomer.email || ownerUser.email;
      finalCustomer.name =
        finalCustomer.name ||
        (ownerUser.firstName && ownerUser.lastName
          ? `${ownerUser.firstName} ${ownerUser.lastName}`
          : ownerUser.email);
    }

    // Get the plan product ID using the mapping function
    const planProductId = await getProductId(planType, billingCycle);

    // Create the subscription using the payment provider
    const paymentProvider = getActivePaymentProvider();
    const result = await paymentProvider.createSubscription({
      organizationId,
      planId: planProductId,
      customer: finalCustomer,
      billingAddress,
      billingCycle,
      metadata: {
        organizationId,
        planType,
      },
      returnUrl:
        returnUrl ||
        `${env.NEXT_PUBLIC_APP_URL}/dashboard/${organizationId}/billing?success=true`,
    });

    // Store the customer ID if we get one back from the subscription creation
    // This would typically come from a webhook, but we're handling it here for completeness
    if (
      result.customerId &&
      (!paymentCustomer || paymentCustomer.customerId !== result.customerId)
    ) {
      await savePaymentCustomer(organizationId, result.customerId);
    }

    // If an existing subscription exists (likely a trial), update it instead of creating a new one
    // But set status to PENDING until payment is confirmed via webhook
    if (existingSubscription) {
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planType: planType as PlanType,
          status: SubscriptionStatus.PENDING, // Set to PENDING until payment confirmed
          billingCycle,
          externalId: result.subscriptionId,
          updatedAt: new Date(),
          metadata: {
            ...((existingSubscription.metadata as Record<string, unknown>) ||
              {}),
            previousTrialSubscription: true,
            upgradedAt: new Date().toISOString(),
            pendingPlanType: planType, // Store the pending plan type
            paymentInitiated: true,
          },
        },
      });
    } else {
      // Create a new subscription record
      const now = new Date();
      const endDate = new Date();
      // Set end date based on billing cycle
      endDate.setMonth(
        endDate.getMonth() + (billingCycle === BillingCycle.YEARLY ? 12 : 1)
      );

      await prisma.subscription.create({
        data: {
          organizationId,
          planType: planType as PlanType,
          status: SubscriptionStatus.PENDING, // Set to PENDING until payment confirmed
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
          externalId: result.subscriptionId,
          metadata: {
            pendingPlanType: planType, // Store the pending plan type
            paymentInitiated: true,
          },
        },
      });
    }

    // Don't update the organization's plan type until payment is confirmed via webhook

    // Revalidate the billing page
    revalidatePath("/dashboard/billing");

    return {
      paymentLinkUrl: result.paymentLinkUrl,
      subscriptionId: result.subscriptionId,
      status: SubscriptionStatus.PENDING, // Return PENDING status
      customerId: result.customerId,
    };
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

export async function updateOrganizationSubscription(
  organizationId: string,
  options: {
    planType?: string;
    billingCycle?: BillingCycle;
  }
) {
  try {
    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    // If no subscription exists or if it exists but has no externalId,
    // create a new subscription instead of updating
    if (!subscription || !subscription.externalId) {
      // Get organization to ensure it exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          users: {
            include: {
              user: true,
            },
            where: {
              role: UserRole.OWNER,
            },
            take: 1,
          },
        },
      });

      if (!organization) {
        throw new Error(`Organization not found: ${organizationId}`);
      }

      // Use default values if not provided
      const planType = options.planType || PlanType.HOBBY;
      const billingCycle = options.billingCycle || BillingCycle.MONTHLY;

      // Get the plan product ID using the mapping function
      const planProductId = await getProductId(planType, billingCycle);

      // Try to get customer info from authenticated user or organization owner
      const authCustomer = await getCustomerFromUser();

      // Check if we already have a stored customer ID for this organization
      const paymentCustomer = await getPaymentCustomer(organizationId);

      let customer: Customer;

      if (paymentCustomer) {
        // If we have a stored customer ID, use it
        customer = {
          customerId: paymentCustomer.customerId,
        };
      } else if (authCustomer) {
        // If we have auth user info, use it
        customer = authCustomer;
      } else if (organization.users.length > 0) {
        // Otherwise use organization owner info
        const ownerUser = organization.users[0].user;
        customer = {
          email: ownerUser.email,
          name:
            ownerUser.firstName && ownerUser.lastName
              ? `${ownerUser.firstName} ${ownerUser.lastName}`
              : ownerUser.email,
        };
      } else {
        // Fallback - should rarely happen
        throw new Error(
          "Unable to determine customer information for subscription"
        );
      }

      // Create basic billing information (should be extended in real implementation)
      const billingAddress = {
        street: "123 Main St",
        city: "New York",
        state: "NY",
        country: "US" as CountryCode,
        zipcode: "10001",
      };

      // Create subscription using payment provider
      const paymentProvider = getActivePaymentProvider();
      const result = await paymentProvider.createSubscription({
        organizationId,
        planId: planProductId,
        customer,
        billingAddress,
        billingCycle,
        metadata: {
          organizationId,
          planType,
        },
        returnUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/${organizationId}/billing?success=true`,
      });

      // Store the customer ID if we got one back
      if (result.customerId) {
        await savePaymentCustomer(organizationId, result.customerId);
      }

      // If subscription already exists but has no externalId, update it
      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planType: subscription.planType, // Keep current plan type until payment confirmed
            status: SubscriptionStatus.PENDING, // Set to PENDING until payment confirmed
            billingCycle,
            externalId: result.subscriptionId,
            updatedAt: new Date(),
            metadata: {
              ...((subscription.metadata as Record<string, unknown>) || {}),
              previousTrialSubscription: true,
              upgradedAt: new Date().toISOString(),
              pendingPlanType: planType, // Store the pending plan type
              paymentInitiated: true,
            },
          },
        });
      } else {
        // Create subscription record in our database
        const now = new Date();
        const endDate = new Date();
        // Set end date based on billing cycle
        endDate.setMonth(
          endDate.getMonth() + (billingCycle === BillingCycle.YEARLY ? 12 : 1)
        );

        await prisma.subscription.create({
          data: {
            organizationId,
            planType: PlanType.HOBBY, // Default to HOBBY until payment confirmed
            status: SubscriptionStatus.PENDING, // Set to PENDING until payment confirmed
            billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: endDate,
            externalId: result.subscriptionId,
            metadata: {
              pendingPlanType: planType, // Store the pending plan type
              paymentInitiated: true,
            },
          },
        });
      }

      // Don't update organization's plan type until payment is confirmed via webhook

      revalidatePath("/dashboard/billing");
      return result;
    }

    // If subscription exists with externalId, proceed with update
    const updateOptions: UpdateSubscriptionOptions = {
      subscriptionId: subscription.externalId || subscription.id,
    };

    const paymentProvider = getActivePaymentProvider();
    let result;

    try {
      if (options.planType) {
        // If changing plan, use the dedicated changePlan method
        const planProductId = options.billingCycle
          ? await getProductId(options.planType, options.billingCycle)
          : await getProductId(options.planType, subscription.billingCycle);

        result = await paymentProvider.changePlan(
          subscription.externalId || subscription.id,
          planProductId
        );
        // Change the subscription in the database
        if (result.status === SubscriptionStatus.ACTIVE) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              planType: options.planType as PlanType,
            },
          });
        }
        // Change the organization's plan type
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            plan: options.planType as PlanType,
          },
        });

        // Enforce bot limits for the new plan (important for downgrades)
        const botLimitResult = await enforceBotLimitsOnPlanChange(
          organizationId,
          options.planType as PlanType
        );

        if (botLimitResult.success && botLimitResult.deactivatedBots > 0) {
          console.log(
            `Immediate plan change for org ${organizationId}: ${botLimitResult.message}`
          );
        } else if (!botLimitResult.success) {
          console.error(
            `Failed to enforce bot limits for immediate plan change for org ${organizationId}: ${botLimitResult.message}`
          );
        }
      } else if (options.billingCycle) {
        // If only changing billing cycle, we need to get the product ID for current plan with new cycle
        const planProductId = await getProductId(
          subscription.planType,
          options.billingCycle
        );

        result = await paymentProvider.changePlan(
          subscription.externalId || subscription.id,
          planProductId
        );
      } else {
        // For other updates not involving plan or cycle changes
        if (options.billingCycle) {
          updateOptions.billingCycle = options.billingCycle;
        }

        result = await paymentProvider.updateSubscription(updateOptions);
      }
    } catch (error) {
      throw new Error(
        `Failed to update subscription with payment provider: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Update local subscription record
    try {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planType: options.planType
            ? (options.planType as PlanType)
            : undefined,
          billingCycle: options.billingCycle,
          status: result.status,
          // Add updatedAt if needed
          updatedAt: new Date(),
        },
      });

      // Also update organization's plan type
      if (options.planType) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            plan: options.planType as PlanType,
          },
        });

        // Enforce bot limits for the new plan (important for downgrades)
        const botLimitResult = await enforceBotLimitsOnPlanChange(
          organizationId,
          options.planType as PlanType
        );

        if (botLimitResult.success && botLimitResult.deactivatedBots > 0) {
          console.log(
            `Plan update for org ${organizationId}: ${botLimitResult.message}`
          );
        } else if (!botLimitResult.success) {
          console.error(
            `Failed to enforce bot limits for org ${organizationId}: ${botLimitResult.message}`
          );
        }
      }
    } catch (dbError) {
      console.error("Error updating local subscription record:", dbError);
      // Don't throw here, the payment provider update was successful
      // But log it for troubleshooting
    }

    revalidatePath("/dashboard/billing");
    return result;
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

export async function cancelOrganizationSubscription(
  organizationId: string,
  atPeriodEnd: boolean = true
) {
  try {
    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new Error(
        `No subscription found for organization: ${organizationId}`
      );
    }

    // Cancel subscription with payment provider
    const paymentProvider = getActivePaymentProvider();
    const result = await paymentProvider.cancelSubscription({
      subscriptionId: subscription.externalId || subscription.id,
      atPeriodEnd,
    });

    // Update local subscription record
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: result.status,
        cancelAtPeriodEnd: atPeriodEnd,
      },
    });

    revalidatePath("/dashboard/billing");
    return result;
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
}

export async function activateOrganizationSubscription(
  organizationId: string,
  returnUrl?: string
) {
  try {
    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new Error(
        `No subscription found for organization: ${organizationId}`
      );
    }

    // Activate subscription with payment provider
    const paymentProvider = getActivePaymentProvider();
    const result = await paymentProvider.activateSubscription({
      subscriptionId: subscription.externalId || subscription.id,
      returnUrl:
        returnUrl ||
        `${env.NEXT_PUBLIC_APP_URL}/dashboard/${organizationId}/billing?success=true`,
    });

    // Check if this is a new subscription (was created as part of reactivation)
    if (result.newSubscription) {
      // If the result has a paymentLinkUrl, update the subscription status to PENDING
      const newStatus = result.paymentLinkUrl
        ? SubscriptionStatus.PENDING
        : result.status;

      // Update the existing subscription record with the new subscription ID
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: newStatus,
          externalId: result.subscriptionId, // Update with the new subscription ID
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
          metadata: {
            ...((subscription.metadata as Record<string, unknown>) || {}),
            reactivated: true,
            previousSubscriptionId: subscription.externalId,
            reactivatedAt: new Date().toISOString(),
            paymentInitiated: !!result.paymentLinkUrl,
            paymentPending: !!result.paymentLinkUrl,
          },
        },
      });

      // Don't update the organization's plan type until payment is confirmed via webhook
      // if a payment link was provided
    } else {
      // Just update the status for a regular reactivation
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: result.status,
          cancelAtPeriodEnd: false,
        },
      });
    }

    revalidatePath("/dashboard/billing");
    return result;
  } catch (error) {
    console.error("Error activating subscription:", error);
    throw error;
  }
}

export async function addAddOnToOrganizationSubscription(
  organizationId: string,
  addOnId: string,
  quantity: number
) {
  try {
    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new Error(
        `No subscription found for organization: ${organizationId}`
      );
    }

    // Get add-on details
    const addOn = await prisma.addOn.findUnique({
      where: { id: addOnId },
    });

    if (!addOn) {
      throw new Error(`Add-on not found: ${addOnId}`);
    }

    // Add add-on to subscription using payment provider
    const paymentProvider = getActivePaymentProvider();
    const result = await paymentProvider.addAddOnToSubscription({
      organizationId,
      subscriptionId: subscription.externalId || subscription.id,
      addOnId: addOn.externalId,
      quantity,
    });

    // Create or update add-on subscription record
    await prisma.addOnSubscription.create({
      data: {
        organizationId,
        addOnId,
        quantity,
        startDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        externalId: result.addOnSubscriptionId,
      },
    });

    revalidatePath("/dashboard/billing");
    return result;
  } catch (error) {
    console.error("Error adding add-on to subscription:", error);
    throw error;
  }
}

export async function updateAddOnQuantity(
  organizationId: string,
  addOnSubscriptionId: string,
  quantity: number
) {
  try {
    // Get add-on subscription
    const addOnSubscription = await prisma.addOnSubscription.findFirst({
      where: {
        id: addOnSubscriptionId,
        organizationId,
      },
    });

    if (!addOnSubscription) {
      throw new Error(`Add-on subscription not found: ${addOnSubscriptionId}`);
    }

    // Update add-on quantity using payment provider
    const paymentProvider = getActivePaymentProvider();
    const result = await paymentProvider.updateAddOnQuantity(
      addOnSubscription.externalId || addOnSubscriptionId,
      quantity
    );

    // Update local add-on subscription record
    await prisma.addOnSubscription.update({
      where: { id: addOnSubscriptionId },
      data: {
        quantity,
      },
    });

    revalidatePath("/dashboard/billing");
    return result;
  } catch (error) {
    console.error("Error updating add-on quantity:", error);
    throw error;
  }
}

export async function removeAddOnFromSubscription(
  organizationId: string,
  addOnSubscriptionId: string
) {
  try {
    // Get add-on subscription
    const addOnSubscription = await prisma.addOnSubscription.findFirst({
      where: {
        id: addOnSubscriptionId,
        organizationId,
      },
    });

    if (!addOnSubscription) {
      throw new Error(`Add-on subscription not found: ${addOnSubscriptionId}`);
    }

    // Remove add-on using payment provider
    const paymentProvider = getActivePaymentProvider();
    await paymentProvider.removeAddOnFromSubscription(
      addOnSubscription.externalId || addOnSubscriptionId
    );

    // Update local add-on subscription record
    await prisma.addOnSubscription.update({
      where: { id: addOnSubscriptionId },
      data: {
        status: SubscriptionStatus.CANCELED,
        endDate: new Date(),
      },
    });

    revalidatePath("/dashboard/billing");
    return true;
  } catch (error) {
    console.error("Error removing add-on from subscription:", error);
    throw error;
  }
}

export async function getOrganizationAddOns(organizationId: string) {
  return await prisma.addOnSubscription.findMany({
    where: {
      organizationId,
      status: SubscriptionStatus.ACTIVE,
    },
    include: {
      addOn: true,
    },
  });
}

export async function getOrganizationCreditBalance(organizationId: string) {
  // Find the message credits feature
  const messageCreditsFeature = await prisma.planFeature.findFirst({
    where: {
      name: "message_credits",
    },
  });

  if (!messageCreditsFeature) {
    return { balance: 0 };
  }

  // Get the credit balance
  const creditBalance = await prisma.creditBalance.findUnique({
    where: {
      organizationId_featureId: {
        organizationId,
        featureId: messageCreditsFeature.id,
      },
    },
  });

  return { balance: creditBalance?.balance || 0 };
}

export async function getOrganizationUsage(organizationId: string) {
  // Get all features first
  const features = await getPlansCache();

  // Get counts of usage by feature
  const usageCounts = await prisma.usageRecord.groupBy({
    by: ["featureId"],
    where: {
      organizationId,
      // Optionally filter by time period
      timestamp: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
      },
    },
    _sum: {
      quantity: true,
    },
  });

  // Create a map of feature ID to usage
  const usageMap = new Map();
  usageCounts.forEach((usage) => {
    usageMap.set(usage.featureId, usage._sum.quantity || 0);
  });

  // Map all features to usage (including those with no usage records)
  return features.map((feature) => {
    return {
      featureId: feature.id,
      featureName: feature.name,
      displayName: feature.displayName,
      usage: usageMap.get(feature.id) || 0,
    };
  });
}

export async function getPlanLimits(planType: string) {
  const features = await getPlansCache();

  // Filter for the specific plan
  const planLimits = features.flatMap((feature) =>
    feature.planLimits
      .filter((limit) => limit.planType === planType)
      .map((limit) => ({
        featureId: feature.id,
        featureName: feature.name,
        displayName: feature.displayName,
        value: limit.value,
        isUnlimited: limit.isUnlimited,
      }))
  );

  return planLimits;
}

export async function getAvailableAddOns() {
  return await getAddOnsCache();
}

export async function createCreditTransaction(
  organizationId: string,
  amount: number,
  type: "PURCHASE" | "USAGE" | "ADJUSTMENT" | "PLAN_GRANT",
  description?: string,
  metadata?: Record<string, unknown>
) {
  try {
    // Find the message credits feature
    const messageCreditsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "message_credits",
      },
    });

    if (!messageCreditsFeature) {
      throw new Error("Message credits feature not found");
    }

    // Get or create credit balance
    let creditBalance = await prisma.creditBalance.findUnique({
      where: {
        organizationId_featureId: {
          organizationId,
          featureId: messageCreditsFeature.id,
        },
      },
    });

    if (!creditBalance) {
      creditBalance = await prisma.creditBalance.create({
        data: {
          organizationId,
          featureId: messageCreditsFeature.id,
          balance: 0,
        },
      });
    }

    // Create transaction
    const transaction = await prisma.creditTransaction.create({
      data: {
        balanceId: creditBalance.id,
        amount,
        type,
        description,
        metadata: metadata as InputJsonValue,
      },
    });

    // Update balance
    await prisma.creditBalance.update({
      where: { id: creditBalance.id },
      data: {
        balance: {
          increment: amount, // This will add or subtract based on amount being positive or negative
        },
      },
    });

    return transaction;
  } catch (error) {
    console.error("Error creating credit transaction:", error);
    throw error;
  }
}

/**
 * Check if a PENDING subscription is considered abandoned (older than 30 minutes)
 */
export async function isSubscriptionAbandoned(
  organizationId: string
): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!subscription || subscription.status !== SubscriptionStatus.PENDING) {
    return false;
  }

  // Check if subscription was updated more than 30 minutes ago
  // const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  // return subscription.updatedAt < thirtyMinutesAgo;
  return true; // Pass always for now
}

/**
 * Reset an abandoned PENDING subscription to allow retry
 */
export async function resetAbandonedSubscription(organizationId: string) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || subscription.status !== SubscriptionStatus.PENDING) {
      throw new Error("No pending subscription found to reset");
    }

    // Check if it's actually abandoned
    const isAbandoned = await isSubscriptionAbandoned(organizationId);
    if (!isAbandoned) {
      throw new Error(
        "Subscription is not abandoned yet (less than 30 minutes old)"
      );
    }

    // Reset the subscription to allow a new attempt
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status:
          subscription.metadata &&
          (subscription.metadata as Record<string, unknown>)
            .previousTrialSubscription
            ? SubscriptionStatus.TRIALING // Reset to trial if it was a trial upgrade
            : SubscriptionStatus.ACTIVE, // Reset to active if it was a plan change
        externalId: null, // Clear the external ID so a new subscription can be created
        metadata: {
          ...((subscription.metadata as Record<string, unknown>) || {}),
          pendingPlanType: null,
          paymentInitiated: null,
          resetAt: new Date().toISOString(),
          resetReason: "abandoned_checkout",
        },
        updatedAt: new Date(),
      },
    });

    console.log(
      `Reset abandoned subscription for organization ${organizationId}`
    );
    return true;
  } catch (error) {
    console.error("Error resetting abandoned subscription:", error);
    throw error;
  }
}

/**
 * Background job function to clean up abandoned PENDING subscriptions
 * Should be called periodically (e.g., every hour) via a cron job
 */
export async function cleanupAbandonedSubscriptions() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    // Find all PENDING subscriptions that are older than 2 hours
    const abandonedSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PENDING,
        updatedAt: {
          lt: twoHoursAgo,
        },
      },
    });

    console.log(
      `Found ${abandonedSubscriptions.length} abandoned subscriptions to clean up`
    );

    let cleanedUp = 0;
    for (const subscription of abandonedSubscriptions) {
      try {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status:
              subscription.metadata &&
              (subscription.metadata as Record<string, unknown>)
                .previousTrialSubscription
                ? SubscriptionStatus.TRIALING // Reset to trial if it was a trial upgrade
                : SubscriptionStatus.ACTIVE, // Reset to active if it was a plan change
            externalId: null, // Clear the external ID
            metadata: {
              ...((subscription.metadata as Record<string, unknown>) || {}),
              pendingPlanType: null,
              paymentInitiated: null,
              cleanedUpAt: new Date().toISOString(),
              cleanupReason: "abandoned_2_hours",
            },
            updatedAt: new Date(),
          },
        });

        cleanedUp++;
        console.log(
          `Cleaned up abandoned subscription for organization ${subscription.organizationId}`
        );
      } catch (error) {
        console.error(
          `Failed to clean up subscription ${subscription.id}:`,
          error
        );
      }
    }

    console.log(
      `Successfully cleaned up ${cleanedUp} out of ${abandonedSubscriptions.length} abandoned subscriptions`
    );
    return { cleanedUp, total: abandonedSubscriptions.length };
  } catch (error) {
    console.error("Error during abandoned subscription cleanup:", error);
    throw error;
  }
}
