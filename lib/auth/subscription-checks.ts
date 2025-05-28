// lib/auth/subscription-checks.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus } from "../generated/prisma";

const RESTRICTED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.EXPIRED,
  SubscriptionStatus.CANCELED,
  SubscriptionStatus.UNPAID,
  SubscriptionStatus.PAST_DUE,
];

export async function checkSubscriptionStatus(req: NextRequest, orgId: string) {
  const PUBLIC_ROUTES = [`/dashboard/${orgId}/billing`];
  // Skip check for public routes
  if (PUBLIC_ROUTES.some((route) => req.nextUrl.pathname.includes(route))) {
    return null; // Allow access
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    select: { status: true },
  });

  if (!subscription) {
    return NextResponse.redirect(new URL("/onboarding/organization", req.url));
  }

  if (RESTRICTED_STATUSES.includes(subscription.status as SubscriptionStatus)) {
    return NextResponse.redirect(new URL("/settings/billing", req.url));
  }

  return null; // Allow access
}
