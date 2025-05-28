import prisma from "../db/prisma";
import { SubscriptionStatus } from "../generated/prisma";

// lib/auth/check-subscription-access.ts
export async function withSubscriptionCheck<T>(
  orgId: string,
  callback: () => Promise<T>,
  options?: { allowStatuses?: SubscriptionStatus[] }
): Promise<T | { error: string; redirectUrl: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    select: { status: true },
  });

  //   const restrictedStatuses: SubscriptionStatus[] = [
  //     SubscriptionStatus.EXPIRED,
  //     SubscriptionStatus.CANCELED,
  //     SubscriptionStatus.UNPAID,
  //     SubscriptionStatus.PAST_DUE,
  //   ];
  const allowedStatuses = options?.allowStatuses || [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
  ];

  if (!subscription || !allowedStatuses.includes(subscription.status)) {
    return {
      error: "Your subscription requires attention",
      redirectUrl: `/dashboard/${orgId}/billing`,
    };
  }

  return await callback();
}
