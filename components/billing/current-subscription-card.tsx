"use client";

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

interface CurrentSubscriptionCardProps {
  subscription: {
    id: string;
    planType: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: Date;
  };
  onCancelSubscription: () => void;
  loading: boolean;
}

export function CurrentSubscriptionCard({
  subscription,
  onCancelSubscription,
  loading,
}: CurrentSubscriptionCardProps) {
  return (
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
            <Badge
              variant={
                subscription.status === "active" ? "default" : "destructive"
              }
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
              {subscription.currentPeriodEnd.toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          onClick={onCancelSubscription}
          disabled={loading || subscription.status !== "active"}
        >
          Cancel Subscription
        </Button>
      </CardFooter>
    </Card>
  );
}
