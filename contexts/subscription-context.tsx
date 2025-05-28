"use client";

import { createContext, useContext, ReactNode } from "react";
import { PlanType, SubscriptionStatus } from "@/lib/generated/prisma";

interface SubscriptionContextType {
  status: SubscriptionStatus;
  planType: PlanType;
  requiresAction: boolean;
  isActive: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({
  children,
  status,
  planType,
}: {
  children: ReactNode;
  status: SubscriptionStatus;
  planType: PlanType;
}) {
  const requiresAction =
    status === SubscriptionStatus.EXPIRED ||
    status === SubscriptionStatus.CANCELED ||
    status === SubscriptionStatus.UNPAID ||
    status === SubscriptionStatus.PAST_DUE;
  const isActive =
    status === SubscriptionStatus.ACTIVE ||
    status === SubscriptionStatus.TRIALING;

  return (
    <SubscriptionContext.Provider
      value={{ status, planType, requiresAction, isActive }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};
