"use client";

import { useState } from "react";
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

interface CurrentSubscriptionCardProps {
  subscription: {
    id: string;
    planType: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: Date;
  };
  onCancelSubscription: () => Promise<void>;
  onReactivateSubscription?: () => Promise<void>;
  onChangePlan: () => void;
  loading: boolean;
}

export function CurrentSubscriptionCard({
  subscription,
  onCancelSubscription,
  onReactivateSubscription,
  onChangePlan,
  loading,
}: CurrentSubscriptionCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);

  const isCanceled =
    subscription.status === "canceled" || subscription.status === "canceling";
  const isActive = subscription.status === "active";

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
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Plan</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.planType}
                </p>
              </div>
              <Badge variant={isActive ? "default" : "destructive"}>
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
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onChangePlan}
          >
            Change Plan
          </Button>

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
