"use server";

import { prisma } from "@/lib/db/prisma";
import { PlanType, TransactionType } from "@/lib/generated/prisma";

/**
 * Seed the ModelCreditCost table with credit costs for different models
 */
export async function seedModelCreditCosts() {
  const modelCosts = [
    // Standard models
    { modelName: "gpt-4o", creditsPerQuery: 5 },
    { modelName: "gpt-o3-mini", creditsPerQuery: 1 },
    { modelName: "grok-3", creditsPerQuery: 5 },
    { modelName: "grok-3-mini", creditsPerQuery: 1 },
    { modelName: "claude-3-7-sonnet", creditsPerQuery: 10 },
    { modelName: "claude-3-5-sonnet", creditsPerQuery: 5 },
    { modelName: "gemini-2-5-pro", creditsPerQuery: 5 },
    { modelName: "gemini-2-0-flash", creditsPerQuery: 1 },
    { modelName: "perplexity-llama-3", creditsPerQuery: 3 },
    { modelName: "perplexity-mistral-large-2", creditsPerQuery: 5 },
  ];

  const results = [];

  for (const modelCost of modelCosts) {
    try {
      const result = await prisma.modelCreditCost.upsert({
        where: {
          modelName: modelCost.modelName,
        },
        update: {
          creditsPerQuery: modelCost.creditsPerQuery,
          isActive: true,
        },
        create: {
          modelName: modelCost.modelName,
          creditsPerQuery: modelCost.creditsPerQuery,
          isActive: true,
        },
      });

      results.push({
        model: modelCost.modelName,
        status: "success",
        id: result.id,
      });
    } catch (error) {
      console.error(
        `Error seeding cost for model ${modelCost.modelName}:`,
        error
      );
      results.push({
        model: modelCost.modelName,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    success: results.every((r) => r.status === "success"),
    results,
  };
}

/**
 * Set up initial message credits for an organization based on their plan
 */
export async function setupInitialCredits(
  organizationId: string,
  planType: PlanType
) {
  try {
    // Find message_credits feature
    const messageCreditsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "message_credits",
      },
    });

    if (!messageCreditsFeature) {
      throw new Error("Message credits feature not found");
    }

    // Get plan limit for message credits
    const planLimit = await prisma.planLimit.findFirst({
      where: {
        planType,
        featureId: messageCreditsFeature.id,
      },
    });

    if (!planLimit) {
      throw new Error(
        `No plan limit found for plan ${planType} and feature message_credits`
      );
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

    // Create credit transaction for plan grant
    const transaction = await prisma.creditTransaction.create({
      data: {
        balanceId: creditBalance.id,
        amount: planLimit.value,
        type: TransactionType.PLAN_GRANT,
        description: `Initial ${planType} plan credit allocation`,
        metadata: {
          planType,
          isInitialSetup: true,
        },
      },
    });

    // Update balance
    await prisma.creditBalance.update({
      where: { id: creditBalance.id },
      data: {
        balance: {
          increment: planLimit.value,
        },
      },
    });

    return {
      success: true,
      creditBalance: {
        id: creditBalance.id,
        newBalance: creditBalance.balance + planLimit.value,
      },
      transaction: {
        id: transaction.id,
        amount: planLimit.value,
      },
    };
  } catch (error) {
    console.error(
      `Error setting up initial credits for org ${organizationId}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
