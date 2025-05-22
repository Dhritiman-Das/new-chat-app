"use client";

import { Plan, PlansGrid } from "@/components/billing/plans-grid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  currentPlanType: string;
  billingCycle: "monthly" | "yearly";
  onBillingCycleChange: (value: "monthly" | "yearly") => void;
  onPlanChange: (planId: string) => Promise<void>;
  loading: boolean;
}

export function PlansDialog({
  open,
  onOpenChange,
  plans,
  currentPlanType,
  billingCycle,
  onBillingCycleChange,
  onPlanChange,
  loading,
}: PlansDialogProps) {
  // When a plan is selected, close the dialog after the plan change is successful
  const handlePlanChange = async (planId: string) => {
    await onPlanChange(planId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl">
        <DialogHeader>
          <DialogTitle>Choose a Plan</DialogTitle>
          <DialogDescription>
            Select the subscription plan that best fits your needs
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PlansGrid
            plans={plans}
            currentPlanType={currentPlanType}
            billingCycle={billingCycle}
            onBillingCycleChange={onBillingCycleChange}
            onPlanChange={handlePlanChange}
            loading={loading}
            isDialog={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
