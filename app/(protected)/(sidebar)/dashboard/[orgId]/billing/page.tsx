import React from "react";
import { BillingClient } from "@/components/billing/billing-client";
import { BillingCycle } from "@/lib/payment/types";
import {
  getOrganizationSubscription,
  getOrganizationCreditBalance,
  getOrganizationUsage,
  getPlanLimits,
  getOrganizationAddOns,
} from "@/lib/payment/billing-service";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getOrganizationInvoices } from "@/lib/queries/cached-queries";
import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import {
  PlanType,
  SubscriptionStatus,
  TransactionType,
  AddOnSubscription,
  Invoice,
} from "@/lib/generated/prisma";

// Define types for the usage data
interface UsageData {
  featureId: string;
  featureName: string;
  displayName: string;
  usage: number;
}

// Define types for plan limits
interface PlanLimit {
  featureId: string;
  featureName: string;
  displayName: string;
  value: number;
  isUnlimited: boolean;
}

// Define type for credit usage data
interface CreditUsageData {
  planAllocation: number;
  planUsed: number;
  additionalBalance: number;
}

// Define type for organization invoices response
interface InvoicesResponse {
  data: Invoice[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Define the Add-On type
interface AddOn {
  id: string;
  name: string;
  featureId: string;
  unitPrice: number;
}

// Define extended AddOnSubscription type that includes the addOn relation
interface AddOnSubscriptionWithAddOn extends AddOnSubscription {
  addOn: AddOn;
}

interface BillingPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  try {
    const { orgId } = await params;

    // Fetch the organization's subscription
    let subscription;
    try {
      subscription = await getOrganizationSubscription(orgId);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      subscription = null;
    }

    // Default subscription state if not found
    const subscriptionData = subscription
      ? {
          id: subscription.id,
          planType: subscription.planType,
          status: subscription.status || SubscriptionStatus.ACTIVE,
          billingCycle: subscription.billingCycle,
          currentPeriodEnd:
            subscription.currentPeriodEnd?.toISOString() ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      : {
          id: "", // Empty string for non-existent subscription
          planType: PlanType.HOBBY, // Default plan
          status: SubscriptionStatus.ACTIVE, // Default status for no subscription
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };

    // Get active bot count for the organization
    async function getActiveBotsCount(organizationId: string) {
      try {
        const count = await prisma.bot.count({
          where: {
            organizationId,
            isActive: true,
          },
        });
        return count;
      } catch (error) {
        console.error("Error counting active bots:", error);
        return 0;
      }
    }

    // Get credit balance and usage data
    let creditBalance = 0;
    try {
      const result = await getOrganizationCreditBalance(orgId);
      creditBalance = result.balance;
    } catch (error) {
      console.error("Error fetching credit balance:", error);
    }

    let usageData: UsageData[] = [];
    try {
      usageData = await getOrganizationUsage(orgId);
    } catch (error) {
      console.error("Error fetching usage data:", error);
    }

    // Get credit usage data for the current billing period
    async function getCreditUsageData(
      organizationId: string
    ): Promise<CreditUsageData> {
      try {
        // Get the message credits feature ID
        const messageCreditsFeature = await prisma.planFeature.findFirst({
          where: {
            name: "message_credits",
          },
        });

        if (!messageCreditsFeature) {
          return {
            planAllocation: 0,
            planUsed: 0,
            additionalBalance: creditBalance,
          };
        }

        // Get the organization's subscription for period info
        const subscription = await prisma.subscription.findUnique({
          where: { organizationId },
        });

        // Define current period
        let currentPeriodStart = new Date();
        let currentPeriodEnd = new Date();

        if (subscription) {
          currentPeriodStart = subscription.currentPeriodStart;
          currentPeriodEnd = subscription.currentPeriodEnd;
        }

        // Get credit transactions for this period
        const periodTransactions = await prisma.creditTransaction.findMany({
          where: {
            creditBalance: {
              organizationId,
              featureId: messageCreditsFeature.id,
            },
            createdAt: {
              gte: currentPeriodStart,
              lte: currentPeriodEnd,
            },
          },
        });

        // Calculate used plan credits in this billing period
        const planCreditsUsed = periodTransactions
          .filter(
            (tx) =>
              tx.type === TransactionType.USAGE &&
              tx.metadata &&
              typeof tx.metadata === "object" &&
              "fromPlanAllocation" in tx.metadata &&
              tx.metadata.fromPlanAllocation === true
          )
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        // Get plan limits for the organization's current plan
        const planLimits = subscription
          ? await prisma.planLimit.findFirst({
              where: {
                planType: subscription.planType,
                featureId: messageCreditsFeature.id,
              },
            })
          : null;

        // Get total plan credit allocation
        const planCreditAllocation = planLimits?.value || 0;

        // The additional balance is the total balance minus remaining plan credits
        const remainingPlanCredits = Math.max(
          0,
          planCreditAllocation - planCreditsUsed
        );

        const additionalBalance = creditBalance - remainingPlanCredits;

        return {
          planAllocation: planCreditAllocation,
          planUsed: planCreditsUsed,
          additionalBalance: additionalBalance > 0 ? additionalBalance : 0,
        };
      } catch (error) {
        console.error("Error getting credit usage data:", error);
        return {
          planAllocation: 0,
          planUsed: 0,
          additionalBalance: creditBalance,
        };
      }
    }

    let creditUsageData: CreditUsageData | undefined;
    try {
      creditUsageData = await getCreditUsageData(orgId);
    } catch (error) {
      console.error("Error fetching credit usage data:", error);
      creditUsageData = {
        planAllocation: 0,
        planUsed: 0,
        additionalBalance: creditBalance,
      };
    }

    // Get active bots count
    const activeBots = await getActiveBotsCount(orgId);

    // Fetch plan limits based on current plan
    let planLimits: PlanLimit[] = [];
    try {
      planLimits = await getPlanLimits(subscriptionData.planType);
    } catch (error) {
      console.error("Error fetching plan limits:", error);
    }

    // Fetch organization add-ons
    let orgAddOns: AddOnSubscriptionWithAddOn[] = [];
    try {
      orgAddOns = (await getOrganizationAddOns(
        orgId
      )) as AddOnSubscriptionWithAddOn[];
    } catch (error) {
      console.error("Error fetching organization add-ons:", error);
    }

    // Combine usage with limits
    const usageWithLimits = usageData.map((usage) => {
      const limit = planLimits.find((l) => l.featureName === usage.featureName);

      // Special handling for agents - include add-ons in the limit and set actual usage
      if (usage.featureName === "agents") {
        // Find agent add-ons if any
        const agentAddOns = orgAddOns.filter(
          (addon) => addon.addOn.featureId === usage.featureId
        );

        // Calculate additional agent allowance from add-ons
        const additionalAgents = agentAddOns.reduce(
          (total, addon) => total + addon.quantity,
          0
        );

        return {
          featureName: usage.featureName,
          usage: activeBots, // Use the actual count of active bots
          limit: (limit?.value || 0) + additionalAgents,
        };
      }

      // For message_credits, we'll let the client-side handle the display logic
      if (usage.featureName === "message_credits") {
        return {
          featureName: usage.featureName,
          usage: usage.usage, // Keep the original usage value
          limit: limit?.value || 0, // Keep the original limit value
        };
      }

      return {
        featureName: usage.featureName,
        usage: usage.usage,
        limit: limit?.value || 0,
      };
    });

    // Add any missing limits that don't have usage yet
    planLimits.forEach((limit) => {
      if (!usageWithLimits.some((u) => u.featureName === limit.featureName)) {
        // Special handling for agents for missing features too
        if (limit.featureName === "agents") {
          // Find agent add-ons if any
          const agentAddOns = orgAddOns.filter(
            (addon) => addon.addOn.featureId === limit.featureId
          );

          // Calculate additional agent allowance from add-ons
          const additionalAgents = agentAddOns.reduce(
            (total, addon) => total + addon.quantity,
            0
          );

          usageWithLimits.push({
            featureName: limit.featureName,
            usage: activeBots, // Use the actual count of active bots
            limit: limit.value + additionalAgents,
          });
          return;
        }

        // For message_credits, keep original values
        if (limit.featureName === "message_credits") {
          usageWithLimits.push({
            featureName: limit.featureName,
            usage: 0, // Will be handled by client component
            limit: limit.value, // Will be handled by client component
          });
          return;
        }

        usageWithLimits.push({
          featureName: limit.featureName,
          usage: 0,
          limit: limit.value,
        });
      }
    });

    // Filter to only show agents and message_credits
    const filteredUsageWithLimits = usageWithLimits.filter(
      (usage) =>
        usage.featureName === "agents" ||
        usage.featureName === "message_credits" ||
        usage.featureName === "links"
    );

    // Map add-ons to client format
    const addOns = orgAddOns.map((addon) => ({
      id: addon.id,
      name: addon.addOn.name,
      quantity: addon.quantity,
      unitPrice: addon.addOn.unitPrice,
    }));

    // Fetch real invoices from the database
    let dbInvoices: InvoicesResponse = {
      data: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    };
    try {
      dbInvoices = await getOrganizationInvoices(orgId, 1, 20);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }

    // Map database invoices to the format expected by the client
    const invoices = dbInvoices.data.map((invoice) => ({
      id: invoice.id,
      invoiceNumber:
        invoice.invoiceNumber || `INV-${invoice.id.substring(0, 6)}`,
      date: invoice.createdAt
        ? format(new Date(invoice.createdAt), "MMM d, yyyy")
        : "-",
      amount: invoice.amount / 100,
      currency: invoice.currency,
      status: invoice.status,
      downloadUrl: invoice.invoiceUrl || undefined,
      paymentIntent: invoice.paymentIntent,
      externalId: invoice.externalId,
    }));

    // Prepare initial data for client component
    const initialData = {
      subscription: subscriptionData,
      creditBalance,
      usageData: filteredUsageWithLimits,
      addOns,
      invoices,
      creditUsageData, // Pass this additional data to the client
    };

    return (
      <div>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/dashboard/${orgId}`}>
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Billing</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="p-6">
          <BillingClient initialData={initialData} orgId={orgId} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in BillingPage:", error);
    return (
      <div>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/dashboard`}>Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Billing</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="p-6">
          <div className="rounded-lg border p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">
              Unable to load billing information
            </h2>
            <p className="text-muted-foreground mb-6">
              We&apos;re having trouble loading your billing details. Please try
              refreshing the page or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
