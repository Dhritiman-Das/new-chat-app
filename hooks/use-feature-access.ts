"use client";

import { useSubscription } from "@/contexts/subscription-context";
import { PlanType, SubscriptionStatus } from "@/lib/generated/prisma";

type FeatureName = "knowledge-base" | "analytics" | "deployments";

// Define the access requirements for each feature
interface FeatureAccess {
  allowedStatuses: SubscriptionStatus[];
  allowedPlans?: PlanType[]; // Optional - if undefined, all plans are allowed
}

export function useFeatureAccess(featureName: FeatureName) {
  const { status, planType, isActive } = useSubscription();

  const featureAccess: Record<FeatureName, FeatureAccess> = {
    "knowledge-base": {
      allowedStatuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
    },
    analytics: {
      allowedStatuses: [SubscriptionStatus.ACTIVE],
      allowedPlans: [PlanType.STANDARD, PlanType.PRO, PlanType.CUSTOM], // Only STANDARD and above
    },
    deployments: {
      allowedStatuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
    },
  };

  const access = featureAccess[featureName];

  // Check if status is allowed
  const hasStatusAccess = access?.allowedStatuses?.includes(status) ?? false;

  // Check if plan type is allowed (if plan restrictions exist)
  const hasPlanAccess =
    !access?.allowedPlans || access.allowedPlans.includes(planType);

  // User has access only if both status and plan requirements are met
  const hasAccess = hasStatusAccess && hasPlanAccess;

  return {
    hasAccess,
    isActive,
    requiresUpgrade: !hasAccess,
    // Add more detailed feedback
    requiresPlanUpgrade: hasStatusAccess && !hasPlanAccess,
    requiresStatusFix: !hasStatusAccess,
    currentPlan: planType,
  };
}
