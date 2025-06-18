"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import { ReactivateSubscriptionDialog } from "./reactivate-subscription-dialog";
import { SubscriptionStatus } from "@/lib/generated/prisma";
import { toast } from "sonner";
import { resetAbandonedSubscriptionAction } from "@/app/actions/billing";

interface CurrentSubscriptionCardProps {
  subscription: {
    id: string;
    planType: string;
    status: SubscriptionStatus;
    billingCycle: string;
    currentPeriodEnd: Date;
    updatedAt?: Date;
  };
  onCancelSubscription: () => Promise<void>;
  onReactivateSubscription?: () => Promise<void>;
  onChangePlan: () => void;
  loading: boolean;
  organizationId: string;
}

export function CurrentSubscriptionCard({
  subscription,
  onCancelSubscription,
  onReactivateSubscription,
  onChangePlan,
  loading,
  organizationId,
}: CurrentSubscriptionCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [isAbandoned, setIsAbandoned] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const isCanceled =
    subscription.status === SubscriptionStatus.CANCELED ||
    subscription.status === SubscriptionStatus.PAUSED;
  const isActive = subscription.status === SubscriptionStatus.ACTIVE;
  const isPending = subscription.status === SubscriptionStatus.PENDING;

  // Check if the subscription is abandoned (PENDING for more than 30 minutes)
  useEffect(() => {
    if (isPending && subscription.updatedAt) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const subscriptionUpdatedAt = new Date(subscription.updatedAt);
      setIsAbandoned(subscriptionUpdatedAt < thirtyMinutesAgo);
    } else {
      setIsAbandoned(false);
    }
  }, [isPending, subscription.updatedAt]);

  const getBadgeColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return "default";
      case SubscriptionStatus.CANCELED:
        return "destructive";
      case SubscriptionStatus.EXPIRED:
        return "destructive";
      case SubscriptionStatus.PAST_DUE:
        return "destructive";
      case SubscriptionStatus.UNPAID:
        return "destructive";
      case SubscriptionStatus.TRIALING:
        return "default";
      case SubscriptionStatus.PENDING:
        return "secondary";
      case SubscriptionStatus.PAUSED:
        return "default";
      default:
        return "default";
    }
  };

  const handleResetAbandonedSubscription = async () => {
    try {
      setResetLoading(true);

      const result = await resetAbandonedSubscriptionAction({
        organizationId,
      });

      if (result?.data?.success) {
        toast.success(
          "Subscription has been reset. You can now select a new plan."
        );
        // Refresh the page to show the updated subscription state
        window.location.reload();
      } else {
        const errorMessage =
          result?.data?.error?.message || "Failed to reset subscription";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error resetting subscription:", error);
      toast.error("Failed to reset subscription. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            Manage your subscription plan and billing cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <p className="font-medium">Plan</p>
              <p className="text-sm text-muted-foreground">
                {subscription.planType}
              </p>
            </div>

            <div>
              <p className="font-medium">Status</p>
              <Badge
                variant={getBadgeColor(subscription.status)}
                className="mt-1"
              >
                {subscription.status}
              </Badge>
            </div>

            <div>
              <p className="font-medium">Billing Cycle</p>
              <p className="text-sm text-muted-foreground">
                {subscription.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}
              </p>
            </div>

            <div>
              <p className="font-medium">Current Period Ends</p>
              <p className="text-sm text-muted-foreground">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Need help? Email us at{" "}
                <a
                  href="mailto:iamdhritiman01@gmail.com"
                  className="underline font-medium"
                >
                  iamdhritiman01@gmail.com
                </a>
              </p>
            </div>

            {isPending && !isAbandoned && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                <p className="font-medium">Payment Processing</p>
                <p className="mt-1">
                  Your subscription payment is being processed. This may take up
                  to 30 minutes. If you need to try a different payment method
                  or the payment isn&apos;t going through, you can reset and try
                  again.
                </p>
              </div>
            )}

            {isPending && isAbandoned && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                <p className="font-medium">Payment Incomplete</p>
                <p className="mt-1">
                  It looks like you didn&apos;t complete the payment process.
                  The payment link may have expired. You can reset your
                  subscription to try again.
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onChangePlan}
            disabled={isPending || loading}
          >
            Change Plan
          </Button>

          {isPending && (
            <Button
              variant="default"
              className="w-full sm:w-auto"
              onClick={handleResetAbandonedSubscription}
              disabled={resetLoading || loading}
            >
              {resetLoading ? "Resetting..." : "Reset & Try Again"}
            </Button>
          )}

          {isActive && (
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => setShowCancelDialog(true)}
              disabled={loading}
            >
              Cancel Subscription
            </Button>
          )}

          {isCanceled && onReactivateSubscription && (
            <Button
              variant="default"
              className="w-full sm:w-auto"
              onClick={() => setShowReactivateDialog(true)}
              disabled={loading}
            >
              Reactivate Subscription
            </Button>
          )}
        </CardFooter>
      </Card>

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={onCancelSubscription}
      />

      {onReactivateSubscription && (
        <ReactivateSubscriptionDialog
          open={showReactivateDialog}
          onOpenChange={setShowReactivateDialog}
          onConfirm={onReactivateSubscription}
        />
      )}
    </>
  );
}
