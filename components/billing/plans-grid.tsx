"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { DowngradeWarningDialog } from "./downgrade-warning-dialog";
import { checkDowngradeImpact } from "@/app/actions/billing";
import { toast } from "sonner";
import { PlanType } from "@/lib/generated/prisma";

export type Plan = {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  buttonText: string;
  popular: boolean;
};

interface PlansGridProps {
  plans: Plan[];
  billingCycle: "monthly" | "yearly";
  onBillingCycleChange: (cycle: "monthly" | "yearly") => void;
  onPlanChange: (planId: string) => void;
  currentPlanType: string;
  loading: boolean;
  isDialog?: boolean;
  hasSubscription?: boolean;
  organizationId?: string;
}

export function PlansGrid({
  plans,
  billingCycle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBillingCycleChange,
  onPlanChange,
  currentPlanType,
  loading,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isDialog = false,
  hasSubscription = false,
  organizationId,
}: PlansGridProps) {
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
  const [pendingDowngrade, setPendingDowngrade] = useState<{
    planId: string;
    planName: string;
    impact: {
      wouldRequireDeactivation: boolean;
      currentActiveBots: number;
      newPlanLimit: number;
      botsToDeactivate: number;
      botNamesToDeactivate: string[];
      success: boolean;
      error?: string;
    };
  } | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  // Function to get plan hierarchy for determining if it's a downgrade
  const getPlanHierarchy = (planType: string): number => {
    const hierarchy: Record<string, number> = {
      HOBBY: 1,
      STANDARD: 2,
      PRO: 3,
      CUSTOM: 4,
    };
    return hierarchy[planType.toUpperCase()] || 0;
  };

  // Function to check if the plan change is a downgrade
  const isDowngrade = (currentPlan: string, targetPlan: string): boolean => {
    return getPlanHierarchy(currentPlan) > getPlanHierarchy(targetPlan);
  };

  // Function to handle plan selection with downgrade check
  const handlePlanSelection = async (planId: string) => {
    // If no organization ID is provided, proceed without downgrade check
    if (!organizationId) {
      onPlanChange(planId);
      return;
    }

    // Check if this would be a downgrade
    if (!isDowngrade(currentPlanType, planId)) {
      // Not a downgrade, proceed normally
      onPlanChange(planId);
      return;
    }

    // This is a potential downgrade, check the impact
    setChecking(planId);
    try {
      const result = await checkDowngradeImpact({
        organizationId,
        targetPlanType: planId.toUpperCase() as PlanType,
      });
      console.log("result", result);

      if (result?.data?.success && result.data.data) {
        const impact = result.data.data;

        // If no deactivation is required, proceed normally
        if (!impact.wouldRequireDeactivation) {
          onPlanChange(planId);
          return;
        }

        // Show downgrade warning with impact details
        const selectedPlan = plans.find((p) => p.id === planId);
        setPendingDowngrade({
          planId,
          planName: selectedPlan?.name || planId,
          impact,
        });
        setShowDowngradeWarning(true);
      } else {
        // If we can't check the impact, show a generic error
        toast.error("Unable to check downgrade impact. Please try again.");
      }
    } catch (error) {
      console.error("Error checking downgrade impact:", error);
      toast.error("Error checking downgrade impact. Please try again.");
    } finally {
      setChecking(null);
    }
  };

  // Function to confirm downgrade after warning
  const handleConfirmDowngrade = async () => {
    if (!pendingDowngrade) return;

    try {
      await onPlanChange(pendingDowngrade.planId);
    } finally {
      setPendingDowngrade(null);
    }
  };

  return (
    <div>
      {/* <div className="flex justify-between items-center mb-6">
        {!isDialog && <h2 className="text-2xl font-bold">Available Plans</h2>}
        <div
          className={`flex items-center space-x-2 ${isDialog ? "ml-auto" : ""}`}
        >
          <span className="text-sm text-muted-foreground">Monthly</span>
          <Button
            variant="outline"
            size="sm"
            className={
              billingCycle === "yearly"
                ? "bg-primary text-primary-foreground"
                : ""
            }
            onClick={() =>
              onBillingCycleChange(
                billingCycle === "yearly" ? "monthly" : "yearly"
              )
            }
          >
            Save with yearly
          </Button>
        </div>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.popular ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                $
                {billingCycle === "yearly"
                  ? plan.priceYearly
                  : plan.priceMonthly}
                <span className="text-sm font-normal text-muted-foreground">
                  /{billingCycle === "yearly" ? "year" : "month"}
                </span>
              </div>

              <div className="space-y-2">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className="mr-2 h-4 w-4 text-primary">
                      <Icons.Check className="h-4 w-4" />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled={
                  loading ||
                  plan.id.toUpperCase() === currentPlanType.toUpperCase() ||
                  !hasSubscription ||
                  checking === plan.id
                }
                onClick={() => handlePlanSelection(plan.id)}
              >
                {checking === plan.id
                  ? "Checking..."
                  : plan.id.toUpperCase() === currentPlanType
                  ? "Current Plan"
                  : plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Downgrade Warning Dialog */}
      {pendingDowngrade && (
        <DowngradeWarningDialog
          open={showDowngradeWarning}
          onOpenChange={setShowDowngradeWarning}
          planName={pendingDowngrade.planName}
          currentActiveBots={pendingDowngrade.impact.currentActiveBots}
          newPlanLimit={pendingDowngrade.impact.newPlanLimit}
          botsToDeactivate={pendingDowngrade.impact.botsToDeactivate}
          botNamesToDeactivate={pendingDowngrade.impact.botNamesToDeactivate}
          onConfirm={handleConfirmDowngrade}
          loading={loading}
        />
      )}
    </div>
  );
}
