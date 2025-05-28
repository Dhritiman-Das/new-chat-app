import { SubscriptionAlert } from "@/components/billing/subscription-alert";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import prisma from "@/lib/db/prisma";
import { PlanType, SubscriptionStatus } from "@/lib/generated/prisma";

interface DashboardWithSubscriptionCheckLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    orgId: string;
  }>;
}

export default async function DashboardWithSubscriptionCheckLayout({
  children,
  params,
}: DashboardWithSubscriptionCheckLayoutProps) {
  const { orgId } = await params;
  let subscriptionStatus: SubscriptionStatus = SubscriptionStatus.ACTIVE;
  let planType: PlanType = PlanType.HOBBY;
  if (orgId) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
      select: { status: true, planType: true },
    });

    if (subscription) {
      subscriptionStatus = subscription.status as SubscriptionStatus;
      planType = subscription.planType;
    }
  }
  return (
    <>
      <SubscriptionProvider status={subscriptionStatus} planType={planType}>
        {children}
        <SubscriptionAlert orgId={orgId} />
      </SubscriptionProvider>
    </>
  );
}
