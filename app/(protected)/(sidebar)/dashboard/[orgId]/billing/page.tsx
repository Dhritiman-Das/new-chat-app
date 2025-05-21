import { BillingClient } from "@/components/billing/billing-client";
import { BillingCycle } from "@/lib/payment/types";
import {
  getOrganizationSubscription,
  getOrganizationCreditBalance,
  getOrganizationUsage,
  getPlanLimits,
  getOrganizationAddOns,
} from "@/lib/payment/billing-service";
import { formatDate } from "@/lib/utils";
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

interface BillingPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { orgId } = await params;

  // Fetch the organization's subscription
  const subscription = await getOrganizationSubscription(orgId);

  // Default subscription state if not found
  const subscriptionData = subscription
    ? {
        id: subscription.id,
        planType: subscription.planType,
        status: subscription.status || "inactive",
        billingCycle: subscription.billingCycle,
        currentPeriodEnd:
          subscription.currentPeriodEnd?.toISOString() ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    : {
        id: "", // Empty string for non-existent subscription
        planType: "HOBBY", // Default plan
        status: "inactive", // Default status for no subscription
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

  // Fetch credit balance
  const { balance: creditBalance } = await getOrganizationCreditBalance(orgId);

  // Fetch organization usage
  const usageData = await getOrganizationUsage(orgId);

  // Fetch plan limits based on current plan
  const planLimits = await getPlanLimits(subscriptionData.planType);

  // Combine usage with limits
  const usageWithLimits = usageData.map((usage) => {
    const limit = planLimits.find((l) => l.featureName === usage.featureName);
    return {
      featureName: usage.featureName,
      usage: usage.usage,
      limit: limit?.value || 0,
    };
  });

  // Add any missing limits that don't have usage yet
  planLimits.forEach((limit) => {
    if (!usageWithLimits.some((u) => u.featureName === limit.featureName)) {
      usageWithLimits.push({
        featureName: limit.featureName,
        usage: 0,
        limit: limit.value,
      });
    }
  });

  // Fetch organization add-ons
  const orgAddOns = await getOrganizationAddOns(orgId);

  // Map add-ons to client format
  const addOns = orgAddOns.map((addon) => ({
    id: addon.id,
    name: addon.addOn.name,
    quantity: addon.quantity,
    unitPrice: addon.addOn.unitPrice,
  }));

  // Mock invoices - in a real app, you'd fetch these from your database
  const invoices = [
    {
      id: "inv_1",
      invoiceNumber: "INV-2023-06001",
      date: formatDate(new Date(2023, 5, 15)),
      amount: 49.0,
      status: "Paid",
      downloadUrl: "#",
    },
    {
      id: "inv_2",
      invoiceNumber: "INV-2023-05001",
      date: formatDate(new Date(2023, 4, 15)),
      amount: 49.0,
      status: "Paid",
      downloadUrl: "#",
    },
  ];

  // Prepare initial data for client component
  const initialData = {
    subscription: subscriptionData,
    creditBalance,
    usageData: usageWithLimits,
    addOns,
    invoices,
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
        <BillingClient orgId={orgId} initialData={initialData} />
      </div>
    </div>
  );
}
