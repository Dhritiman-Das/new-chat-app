"use server";

import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus, PlanType } from "../generated/prisma";

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

/**
 * Check if activating a bot would exceed the plan limits
 */
export async function canActivateBot(
  organizationId: string,
  excludeBotId?: string
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

    // Only active or trialing subscriptions can activate bots
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

    // Count active bots (excluding the bot being updated if specified)
    const activeBotsCount = await prisma.bot.count({
      where: {
        organizationId,
        isActive: true,
        ...(excludeBotId && { id: { not: excludeBotId } }),
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

    // Check if activating this bot would exceed the limit
    return activeBotsCount < planLimit.value + additionalSlots;
  } catch (error) {
    console.error(
      `Error checking if bot can be activated for org ${organizationId}:`,
      error
    );
    return false;
  }
}

/**
 * Enforce bot limits for an organization when plan changes (particularly downgrades)
 * Deactivates excess bots when the new plan allows fewer active bots
 */
export async function enforceBotLimitsOnPlanChange(
  organizationId: string,
  newPlanType: PlanType
): Promise<{
  success: boolean;
  deactivatedBots: number;
  message: string;
}> {
  try {
    console.log(
      `Enforcing bot limits for org ${organizationId} with new plan ${newPlanType}`
    );

    // Get the agents feature
    const agentsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "agents",
      },
    });

    if (!agentsFeature) {
      console.error("Agents feature not found in database");
      return {
        success: false,
        deactivatedBots: 0,
        message: "Agents feature not found",
      };
    }

    // Get the new plan limit for agents
    const newPlanLimit = await prisma.planLimit.findFirst({
      where: {
        planType: newPlanType,
        featureId: agentsFeature.id,
      },
    });

    if (!newPlanLimit) {
      console.error(
        `No plan limit found for plan ${newPlanType} and feature agents`
      );
      return {
        success: false,
        deactivatedBots: 0,
        message: `Plan limit not found for ${newPlanType}`,
      };
    }

    // If the new plan is unlimited, no need to deactivate any bots
    if (newPlanLimit.isUnlimited) {
      return {
        success: true,
        deactivatedBots: 0,
        message: "New plan allows unlimited bots",
      };
    }

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

    const totalAllowedBots = newPlanLimit.value + additionalSlots;

    // Get all currently active bots for this organization
    const activeBots = await prisma.bot.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        // Prioritize bots by creation date (newest first) for deactivation
        // You could also prioritize by usage metrics if available
        createdAt: "desc",
      },
    });

    const currentActiveBots = activeBots.length;

    // If current active bots are within the limit, no action needed
    if (currentActiveBots <= totalAllowedBots) {
      return {
        success: true,
        deactivatedBots: 0,
        message: `Current active bots (${currentActiveBots}) are within the new plan limit (${totalAllowedBots})`,
      };
    }

    // Calculate how many bots need to be deactivated
    const excessBots = currentActiveBots - totalAllowedBots;
    const botsToDeactivate = activeBots.slice(0, excessBots);

    // Deactivate the excess bots
    const deactivatedBotIds = botsToDeactivate.map((bot) => bot.id);

    await prisma.bot.updateMany({
      where: {
        id: {
          in: deactivatedBotIds,
        },
      },
      data: {
        isActive: false,
      },
    });

    console.log(
      `Deactivated ${excessBots} bots for organization ${organizationId} due to plan downgrade`
    );

    return {
      success: true,
      deactivatedBots: excessBots,
      message: `Successfully deactivated ${excessBots} bots to comply with new plan limit of ${totalAllowedBots} active bots`,
    };
  } catch (error) {
    console.error(
      `Error enforcing bot limits for org ${organizationId}:`,
      error
    );
    return {
      success: false,
      deactivatedBots: 0,
      message: `Failed to enforce bot limits: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Check what would happen if an organization downgrades to a specific plan
 * Returns information about bot deactivations that would be required
 */
export async function getDowngradeImpact(
  organizationId: string,
  targetPlanType: PlanType
): Promise<{
  wouldRequireDeactivation: boolean;
  currentActiveBots: number;
  newPlanLimit: number;
  botsToDeactivate: number;
  botNamesToDeactivate: string[];
  success: boolean;
  error?: string;
}> {
  try {
    // Get the agents feature
    const agentsFeature = await prisma.planFeature.findFirst({
      where: {
        name: "agents",
      },
    });

    if (!agentsFeature) {
      return {
        wouldRequireDeactivation: false,
        currentActiveBots: 0,
        newPlanLimit: 0,
        botsToDeactivate: 0,
        botNamesToDeactivate: [],
        success: false,
        error: "Agents feature not found",
      };
    }

    // Get the target plan limit for agents
    const targetPlanLimit = await prisma.planLimit.findFirst({
      where: {
        planType: targetPlanType as PlanType,
        featureId: agentsFeature.id,
      },
    });

    if (!targetPlanLimit) {
      return {
        wouldRequireDeactivation: false,
        currentActiveBots: 0,
        newPlanLimit: 0,
        botsToDeactivate: 0,
        botNamesToDeactivate: [],
        success: false,
        error: `Plan limit not found for ${targetPlanType}`,
      };
    }

    // If the target plan is unlimited, no deactivation needed
    if (targetPlanLimit.isUnlimited) {
      return {
        wouldRequireDeactivation: false,
        currentActiveBots: 0,
        newPlanLimit: -1, // Represent unlimited as -1
        botsToDeactivate: 0,
        botNamesToDeactivate: [],
        success: true,
      };
    }

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

    const newTotalLimit = targetPlanLimit.value + additionalSlots;

    // Get all currently active bots for this organization
    const activeBots = await prisma.bot.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        // Same order as enforcement function - newest first for consistency
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    const currentActiveBots = activeBots.length;

    // Check if downgrade would require deactivation
    if (currentActiveBots <= newTotalLimit) {
      return {
        wouldRequireDeactivation: false,
        currentActiveBots,
        newPlanLimit: newTotalLimit,
        botsToDeactivate: 0,
        botNamesToDeactivate: [],
        success: true,
      };
    }

    // Calculate how many bots would need to be deactivated
    const botsToDeactivate = currentActiveBots - newTotalLimit;
    const botsToDeactivateList = activeBots.slice(0, botsToDeactivate);

    return {
      wouldRequireDeactivation: true,
      currentActiveBots,
      newPlanLimit: newTotalLimit,
      botsToDeactivate,
      botNamesToDeactivate: botsToDeactivateList.map((bot) => bot.name),
      success: true,
    };
  } catch (error) {
    console.error(
      `Error checking downgrade impact for org ${organizationId}:`,
      error
    );
    return {
      wouldRequireDeactivation: false,
      currentActiveBots: 0,
      newPlanLimit: 0,
      botsToDeactivate: 0,
      botNamesToDeactivate: [],
      success: false,
      error: `Failed to check downgrade impact: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
