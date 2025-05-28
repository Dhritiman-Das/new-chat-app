"use client";

import { ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface AnalyticsAccessCheckProps {
  children: ReactNode;
  orgId: string;
  fallback?: ReactNode;
}

export function AnalyticsAccessCheck({
  children,
  orgId,
  fallback,
}: AnalyticsAccessCheckProps) {
  const { hasAccess, requiresPlanUpgrade } = useFeatureAccess("analytics");

  if (hasAccess) {
    return <>{children}</>;
  }

  // Return fallback content if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback with upgrade button
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center rounded-md border border-dashed">
      <Icons.CircleOff className="h-8 w-8 text-muted-foreground mb-2" />
      <h3 className="text-sm font-medium mb-1">Analytics Requires Upgrade</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {requiresPlanUpgrade
          ? "Available on Standard and Pro plans"
          : "Update your subscription to access analytics"}
      </p>
      <Button size="sm" variant="outline" asChild>
        <Link href={`/dashboard/${orgId}/billing`}>Upgrade Plan</Link>
      </Button>
    </div>
  );
}
