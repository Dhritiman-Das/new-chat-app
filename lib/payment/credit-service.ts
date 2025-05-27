"use server";

import { prisma } from "@/lib/db/prisma";
import { createCreditTransaction } from "./billing-service";
import { TransactionType } from "../generated/prisma";

/**
 * Get the credit cost for a specific model
 */
export async function getModelCreditCost(modelId: string): Promise<number> {
  try {
    // Find the model cost in the database
    const modelCost = await prisma.modelCreditCost.findFirst({
      where: {
        modelName: modelId,
        isActive: true,
      },
    });

    // Return the cost if found, otherwise return a default value
    return modelCost?.creditsPerQuery || 1;
  } catch (error) {
    console.error(`Error getting model credit cost for ${modelId}:`, error);
    // Default to 1 credit if there's an error
    return 1;
  }
}

/**
 * Check if an organization has enough credits for a model use
 */
export async function hasEnoughCredits(
  organizationId: string,
  modelId: string
): Promise<boolean> {
  try {
    // Get the credit cost for the model
    const creditCost = await getModelCreditCost(modelId);

    // Find the message credits feature
    const messageCreditsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "message_credits",
      },
    });

    if (!messageCreditsFeature) {
      console.error("Message credits feature not found");
      return false;
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

    // Check if the balance is sufficient
    return (creditBalance?.balance || 0) >= creditCost;
  } catch (error) {
    console.error(`Error checking credits for org ${organizationId}:`, error);
    return false;
  }
}

/**
 * Process credit usage for an AI model query
 *
 * This function handles the credit deduction logic, prioritizing plan-allocated credits
 * before using add-on purchased credits.
 */
export async function processModelCreditUsage(
  organizationId: string,
  modelId: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    // Get the credit cost for the model
    const creditCost = await getModelCreditCost(modelId);

    // Find the message credits feature
    const messageCreditsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "message_credits",
      },
    });

    if (!messageCreditsFeature) {
      console.error("Message credits feature not found");
      return false;
    }

    // Get the organization's subscription
    const subscription = await prisma.subscription.findUnique({
      where: {
        organizationId,
      },
      include: {
        organization: true,
      },
    });

    // Get plan limits for the organization's current plan
    const planLimits = subscription
      ? await prisma.planLimit.findFirst({
          where: {
            planType: subscription.planType,
            featureId: messageCreditsFeature.id,
          },
        })
      : null;

    // Get the current billing period
    let currentPeriodStart = new Date();
    let currentPeriodEnd = new Date();

    if (subscription) {
      currentPeriodStart = subscription.currentPeriodStart;
      currentPeriodEnd = subscription.currentPeriodEnd;
    }

    // Get credit transactions for the current billing period to determine plan usage
    const periodTransactions = await prisma.creditTransaction.findMany({
      where: {
        creditBalance: {
          organizationId,
          featureId: messageCreditsFeature.id,
        },
        createdAt: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
    });

    // Calculate used plan credits in this billing period
    const planCreditsUsed = periodTransactions
      .filter(
        (tx) =>
          tx.type === TransactionType.USAGE &&
          tx.metadata &&
          typeof tx.metadata === "object" &&
          "fromPlanAllocation" in tx.metadata &&
          tx.metadata.fromPlanAllocation === true
      )
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Get total plan credit allocation
    const planCreditAllocation = planLimits?.value || 0;

    // Get remaining plan credits
    const remainingPlanCredits = Math.max(
      0,
      planCreditAllocation - planCreditsUsed
    );

    // Get current total balance
    const creditBalance = await prisma.creditBalance.findUnique({
      where: {
        organizationId_featureId: {
          organizationId,
          featureId: messageCreditsFeature.id,
        },
      },
    });

    if (!creditBalance) {
      console.error(
        `No credit balance found for organization ${organizationId}`
      );
      return false;
    }

    // Check if we have enough credits total
    if (creditBalance.balance < creditCost) {
      console.error(`Insufficient credits for organization ${organizationId}`);
      return false;
    }

    // Determine how many credits to take from plan allocation vs purchased credits
    const fromPlanCredits = Math.min(creditCost, remainingPlanCredits);
    const fromPurchasedCredits = creditCost - fromPlanCredits;

    // Create transaction records for the usage
    if (fromPlanCredits > 0) {
      await createCreditTransaction(
        organizationId,
        -fromPlanCredits,
        TransactionType.USAGE,
        `Model usage: ${modelId}`,
        {
          ...metadata,
          modelId,
          fromPlanAllocation: true,
        }
      );
    }

    if (fromPurchasedCredits > 0) {
      await createCreditTransaction(
        organizationId,
        -fromPurchasedCredits,
        TransactionType.USAGE,
        `Model usage: ${modelId}`,
        {
          ...metadata,
          modelId,
          fromPlanAllocation: false,
        }
      );
    }

    return true;
  } catch (error) {
    console.error(`Error processing credits for org ${organizationId}:`, error);
    return false;
  }
}
