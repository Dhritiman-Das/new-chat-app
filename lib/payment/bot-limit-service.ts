"use server";

import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus } from "../generated/prisma";

/**
 * Check if an organization has available bot slots within their plan limit
 */
export async function hasAvailableBotSlots(
  organizationId: string
): Promise<boolean> {
  try {
    // Get the agents feature
    const agentsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "agents",
      },
    });

    if (!agentsFeature) {
      console.error("Agents feature not found in database");
      return false;
    }

    // Get the organization's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        organization: true,
      },
    });

    if (!subscription) {
      console.error(`No subscription found for organization ${organizationId}`);
      return false;
    }

    // Only active or trialing subscriptions can use the feature
    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIALING
    ) {
      return false;
    }

    // Get the current plan limit for agents
    const planLimit = await prisma.planLimit.findFirst({
      where: {
        planType: subscription.planType,
        featureId: agentsFeature.id,
      },
    });

    if (!planLimit) {
      console.error(
        `No plan limit found for organization ${organizationId} and feature agents`
      );
      return false;
    }

    // If unlimited, return true
    if (planLimit.isUnlimited) {
      return true;
    }

    // Count active bots
    const activeBotsCount = await prisma.bot.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Check if the organization has any add-ons for additional bot slots
    const addOns = await prisma.addOnSubscription.findMany({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
        addOn: {
          featureId: agentsFeature.id,
        },
      },
      include: {
        addOn: true,
      },
    });

    // Calculate additional bot slots from add-ons
    const additionalSlots = addOns.reduce(
      (total, addon) => total + addon.quantity,
      0
    );

    // Check if creating a new bot would exceed the limit
    return activeBotsCount < planLimit.value + additionalSlots;
  } catch (error) {
    console.error(`Error checking bot slots for org ${organizationId}:`, error);
    return false;
  }
}

/**
 * Get information about bot usage and limits
 */
export async function getBotUsageInfo(organizationId: string): Promise<{
  limit: number;
  usage: number;
  available: number;
  hasAvailable: boolean;
}> {
  try {
    // Get the agents feature
    const agentsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "agents",
      },
    });

    if (!agentsFeature) {
      return { limit: 0, usage: 0, available: 0, hasAvailable: false };
    }

    // Get the organization's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        organization: true,
      },
    });

    if (!subscription) {
      return { limit: 0, usage: 0, available: 0, hasAvailable: false };
    }

    // Get the current plan limit for agents
    const planLimit = await prisma.planLimit.findFirst({
      where: {
        planType: subscription.planType,
        featureId: agentsFeature.id,
      },
    });

    if (!planLimit) {
      return { limit: 0, usage: 0, available: 0, hasAvailable: false };
    }

    // Count active bots
    const activeBotsCount = await prisma.bot.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Check if the organization has any add-ons for additional bot slots
    const addOns = await prisma.addOnSubscription.findMany({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
        addOn: {
          featureId: agentsFeature.id,
        },
      },
      include: {
        addOn: true,
      },
    });

    // Calculate additional bot slots from add-ons
    const additionalSlots = addOns.reduce(
      (total, addon) => total + addon.quantity,
      0
    );

    const totalLimit = planLimit.value + additionalSlots;
    const available = Math.max(0, totalLimit - activeBotsCount);

    return {
      limit: totalLimit,
      usage: activeBotsCount,
      available,
      hasAvailable: available > 0 || planLimit.isUnlimited,
    };
  } catch (error) {
    console.error(
      `Error getting bot usage info for org ${organizationId}:`,
      error
    );
    return { limit: 0, usage: 0, available: 0, hasAvailable: false };
  }
}
