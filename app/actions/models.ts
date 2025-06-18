"use server";

import { prisma } from "@/lib/db/prisma";

export async function getModelCreditCosts() {
  try {
    const modelCosts = await prisma.modelCreditCost.findMany({
      where: {
        isActive: true,
      },
      select: {
        modelName: true,
        creditsPerQuery: true,
      },
    });

    // Convert to a map for easy lookup
    const costsMap = new Map(
      modelCosts.map((cost: { modelName: string; creditsPerQuery: number }) => [
        cost.modelName,
        cost.creditsPerQuery,
      ])
    );

    return costsMap;
  } catch (error) {
    console.error("Error fetching model credit costs:", error);
    return new Map();
  }
}

export async function getModelCreditCost(modelName: string) {
  try {
    const modelCost = await prisma.modelCreditCost.findUnique({
      where: {
        modelName,
        isActive: true,
      },
      select: {
        creditsPerQuery: true,
      },
    });

    return modelCost?.creditsPerQuery || null;
  } catch (error) {
    console.error("Error fetching model credit cost:", error);
    return null;
  }
}
