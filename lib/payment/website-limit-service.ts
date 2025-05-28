"use server";

import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus } from "../generated/prisma";
import { withSubscriptionCheck } from "../auth/check-subscription-access";
import { InputJsonValue } from "../generated/prisma/runtime/library";

/**
 * Check if an organization has any remaining website links within their plan limit
 */
export async function hasRemainingWebsiteLinks(
  organizationId: string,
  requestedLinks: number = 1
): Promise<boolean> {
  try {
    // Get the links feature
    const linksFeature = await prisma.planFeature.findFirst({
      where: {
        name: "links",
      },
    });

    if (!linksFeature) {
      console.error("Links feature not found in database");
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

    // Get the current plan limit for links
    const planLimit = await prisma.planLimit.findFirst({
      where: {
        planType: subscription.planType,
        featureId: linksFeature.id,
      },
    });

    if (!planLimit) {
      console.error(
        `No plan limit found for organization ${organizationId} and feature links`
      );
      return false;
    }

    // If unlimited, return true
    if (planLimit.isUnlimited) {
      return true;
    }

    // Calculate the current usage
    const usageRecords = await prisma.usageRecord.aggregate({
      where: {
        organizationId,
        featureId: linksFeature.id,
      },
      _sum: {
        quantity: true,
      },
    });

    const currentUsage = usageRecords._sum.quantity || 0;

    // Check if adding the requested links would exceed the limit
    return currentUsage + requestedLinks <= planLimit.value;
  } catch (error) {
    console.error(
      `Error checking website links for org ${organizationId}:`,
      error
    );
    return false;
  }
}

/**
 * Track usage of website links
 */
export async function trackWebsiteLinkUsage(
  organizationId: string,
  linksCount: number,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    // Get the links feature
    const linksFeature = await prisma.planFeature.findFirst({
      where: {
        name: "links",
      },
    });

    if (!linksFeature) {
      console.error("Links feature not found in database");
      return false;
    }

    // Create a usage record
    await prisma.usageRecord.create({
      data: {
        organizationId,
        featureId: linksFeature.id,
        quantity: linksCount,
        metadata: metadata as InputJsonValue,
      },
    });

    return true;
  } catch (error) {
    console.error(
      `Error tracking website link usage for org ${organizationId}:`,
      error
    );
    return false;
  }
}

// Define response types for clarity
export interface WebsiteLinkErrorResponse {
  error: string;
  code: string;
  redirectUrl?: string;
  success: boolean;
}

// Subscription error response type
interface SubscriptionErrorResponse {
  error: string;
  redirectUrl: string;
}

// Type guard function
function isSubscriptionError(obj: unknown): obj is SubscriptionErrorResponse {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "error" in obj &&
    "redirectUrl" in obj
  );
}

export type WebsiteLinkCheckResult<T> = T | WebsiteLinkErrorResponse;

/**
 * Check subscription and website limit in one call
 */
export async function withWebsiteLinkCheck<T>(
  organizationId: string,
  requestedLinks: number,
  callback: () => Promise<T>
): Promise<WebsiteLinkCheckResult<T>> {
  // First check subscription status
  const subscriptionResult = await withSubscriptionCheck(
    organizationId,
    async () => {
      // Then check website link limits
      const hasLinks = await hasRemainingWebsiteLinks(
        organizationId,
        requestedLinks
      );

      if (!hasLinks) {
        return {
          error: "Website link limit exceeded",
          code: "WEBSITE_LINK_LIMIT_EXCEEDED",
          redirectUrl: `/dashboard/${organizationId}/billing`,
          success: false,
        } as WebsiteLinkErrorResponse;
      }

      // If both checks pass, run the callback
      return await callback();
    },
    { allowStatuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
  );

  // If subscription check failed
  if (isSubscriptionError(subscriptionResult)) {
    return {
      error: subscriptionResult.error,
      code: "SUBSCRIPTION_REQUIRED",
      redirectUrl: subscriptionResult.redirectUrl,
      success: false,
    } as WebsiteLinkErrorResponse;
  }

  return subscriptionResult;
}
