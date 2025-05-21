"use client";

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
}

export function PlansGrid({
  plans,
  billingCycle,
  onBillingCycleChange,
  onPlanChange,
  currentPlanType,
  loading,
}: PlansGridProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Available Plans</h2>
        <div className="flex items-center space-x-2">
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
      </div>

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
                disabled={loading || plan.id.toUpperCase() === currentPlanType}
                onClick={() => onPlanChange(plan.id)}
              >
                {plan.id.toUpperCase() === currentPlanType
                  ? "Current Plan"
                  : plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
