"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryState } from "nuqs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CurrentSubscriptionCard } from "@/components/billing/current-subscription-card";
import { PlansGrid, type Plan } from "@/components/billing/plans-grid";
import { UsageTab } from "@/components/billing/usage-tab";
import { AddOnsTab } from "@/components/billing/addons-tab";
import { InvoicesTab } from "@/components/billing/invoices-tab";
import { BillingCycle, SubscriptionStatus } from "@/lib/payment/types";
import {
  ClientInvoice,
  adaptClientInvoicesToInvoicesTab,
} from "@/components/billing/invoice-types";

import {
  addAddOnToOrganizationSubscription,
  cancelOrganizationSubscription,
  removeAddOnFromSubscription,
  updateAddOnQuantity,
  updateOrganizationSubscription,
} from "@/lib/payment/billing-service";

// Hard-coded plans data
const plans: Plan[] = [
  {
    id: "hobby",
    name: "Hobby",
    description: "For individual developers and small projects",
    priceMonthly: 19,
    priceYearly: 190, // 2 months free
    features: [
      "2 agents",
      "500 message credits",
      "No analytics",
      "5 website links",
    ],
    buttonText: "Get Started",
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    description: "For growing teams and businesses",
    priceMonthly: 49,
    priceYearly: 490, // 2 months free
    features: [
      "5 agents",
      "2,000 message credits",
      "Basic analytics",
      "25 website links",
    ],
    buttonText: "Subscribe",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For larger organizations with advanced needs",
    priceMonthly: 99,
    priceYearly: 990, // 2 months free
    features: [
      "15 agents",
      "10,000 message credits",
      "Advanced analytics",
      "100 website links",
    ],
    buttonText: "Go Pro",
    popular: false,
  },
];

interface BillingClientProps {
  orgId: string;
  initialData: {
    subscription: {
      id: string;
      planType: string;
      status: SubscriptionStatus | string;
      billingCycle: string;
      currentPeriodEnd: string;
    };
    creditBalance: number;
    usageData: {
      featureName: string;
      usage: number;
      limit: number;
    }[];
    addOns: {
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }[];
    invoices: ClientInvoice[];
  };
}

export function BillingClient({ orgId, initialData }: BillingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useQueryState("cycle", {
    defaultValue: "monthly",
  });
  const [tab, setTab] = useQueryState("tab", { defaultValue: "subscription" });

  // State initialized with server data
  const [subscription, setSubscription] = useState({
    ...initialData.subscription,
    currentPeriodEnd: new Date(initialData.subscription.currentPeriodEnd),
  });

  const [creditBalance] = useState(initialData.creditBalance);
  const [usageData] = useState(initialData.usageData);
  const [addOns, setAddOns] = useState(initialData.addOns);
  const [invoices] = useState(initialData.invoices);

  // Function to handle plan change
  const handlePlanChange = async (planId: string) => {
    try {
      setLoading(true);

      // Convert planId to Plan Type
      const planType = planId.toUpperCase();

      // Map billing cycle string to enum
      const cycle =
        billingCycle === "yearly" ? BillingCycle.YEARLY : BillingCycle.MONTHLY;

      // Show loading toast
      const loadingToast = toast.loading(`Updating your plan to ${planId}...`);

      // For all users, attempt to update the subscription with the chosen plan
      const result = await updateOrganizationSubscription(orgId, {
        planType,
        billingCycle: cycle,
      });

      // Remove loading toast
      toast.dismiss(loadingToast);

      // Check if we got a payment link back and redirect if necessary
      if (
        result &&
        typeof result === "object" &&
        "paymentLinkUrl" in result &&
        result.paymentLinkUrl
      ) {
        toast.info("Redirecting to payment page...");
        window.location.href = result.paymentLinkUrl as string;
        return; // Stop execution if redirecting
      }

      // If the user already had a subscription or the update was successful
      if (
        subscription.status !== "inactive" ||
        (result && result.status === "active")
      ) {
        toast.success(`Successfully updated to ${planId} plan`);

        // Update local state to reflect changes
        setSubscription({
          ...subscription,
          id: result?.subscriptionId || subscription.id,
          planType: planType,
          status: result?.status || "active",
          billingCycle: cycle === BillingCycle.YEARLY ? "YEARLY" : "MONTHLY",
        });
      } else {
        toast.success(`Successfully subscribed to ${planId} plan`);
      }

      // Refresh the page to show updated subscription from the server
      router.refresh();
    } catch (error) {
      console.error("Error changing plan:", error);

      // If it's a payment provider error (likely a message for end users)
      if (
        error instanceof Error &&
        error.message.includes("payment provider")
      ) {
        // Cleaner message for payment provider errors
        const errorMessage = error.message.includes(":")
          ? error.message.split(":")[1].trim()
          : error.message;
        toast.error(`Plan change failed: ${errorMessage}`);
      } else if (error instanceof Error) {
        toast.error(`Failed to change plan: ${error.message}`);
      } else {
        toast.error("Failed to change plan. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to handle cancellation
  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) {
      return;
    }

    try {
      setLoading(true);
      await cancelOrganizationSubscription(orgId, true);
      toast.success(
        "Your subscription will be canceled at the end of the current billing period"
      );

      // Update local state
      setSubscription({
        ...subscription,
        status: "canceling",
      });

      router.refresh();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to add an add-on
  const handleAddAddOn = async (addOnId: string, quantity: number = 1) => {
    try {
      setLoading(true);
      await addAddOnToOrganizationSubscription(orgId, addOnId, quantity);
      toast.success("Add-on added successfully");
      router.refresh();
    } catch (error) {
      console.error("Error adding add-on:", error);
      toast.error("Failed to add add-on. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to update add-on quantity
  const handleUpdateAddOnQuantity = async (
    addOnId: string,
    quantity: number
  ) => {
    try {
      setLoading(true);
      await updateAddOnQuantity(orgId, addOnId, quantity);

      // Update local state
      setAddOns(
        addOns.map((addon) =>
          addon.id === addOnId ? { ...addon, quantity } : addon
        )
      );

      toast.success("Add-on quantity updated");
      router.refresh();
    } catch (error) {
      console.error("Error updating add-on quantity:", error);
      toast.error("Failed to update add-on. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to remove an add-on
  const handleRemoveAddOn = async (addOnId: string) => {
    if (!confirm("Are you sure you want to remove this add-on?")) {
      return;
    }

    try {
      setLoading(true);
      await removeAddOnFromSubscription(orgId, addOnId);

      // Update local state
      setAddOns(addOns.filter((addon) => addon.id !== addOnId));

      toast.success("Add-on removed successfully");
      router.refresh();
    } catch (error) {
      console.error("Error removing add-on:", error);
      toast.error("Failed to remove add-on. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle purchase credits (placeholder)
  const handlePurchaseCredits = () => {
    toast.info("This feature is coming soon!");
  };

  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="subscription" className="w-[150px]">
            Subscription
          </TabsTrigger>
          <TabsTrigger value="usage" className="w-[150px]">
            Usage & Limits
          </TabsTrigger>
          <TabsTrigger value="addons" className="w-[150px]">
            Add-ons
          </TabsTrigger>
          <TabsTrigger value="invoices" className="w-[150px]">
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-4">
          <CurrentSubscriptionCard
            subscription={subscription}
            onCancelSubscription={handleCancelSubscription}
            loading={loading}
          />

          <PlansGrid
            plans={plans}
            currentPlanType={subscription.planType}
            billingCycle={billingCycle as "monthly" | "yearly"}
            onBillingCycleChange={setBillingCycle}
            onPlanChange={handlePlanChange}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="usage">
          <UsageTab
            usageData={usageData}
            creditBalance={creditBalance}
            onPurchaseCredits={handlePurchaseCredits}
          />
        </TabsContent>

        <TabsContent value="addons">
          <AddOnsTab
            addOns={addOns}
            onAddAddOn={handleAddAddOn}
            onUpdateAddOnQuantity={handleUpdateAddOnQuantity}
            onRemoveAddOn={handleRemoveAddOn}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab
            invoices={adaptClientInvoicesToInvoicesTab(invoices)}
            onPageChange={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
