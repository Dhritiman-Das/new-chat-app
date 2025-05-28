"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSubscription } from "@/contexts/subscription-context";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SubscriptionStatus } from "@/lib/generated/prisma";

export function SubscriptionAlert({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const { requiresAction, status } = useSubscription();
  const pathname = usePathname();
  const EXCLUDED_PATHS = useMemo(
    () => [`/dashboard/${orgId}/billing`],
    [orgId]
  );

  useEffect(() => {
    // Only show on paths that aren't explicitly excluded
    if (
      requiresAction &&
      !EXCLUDED_PATHS.some((path) => pathname.includes(path))
    ) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [pathname, requiresAction, EXCLUDED_PATHS]);

  const getTitle = () => {
    switch (status) {
      case SubscriptionStatus.EXPIRED:
        return "Your trial has ended";
      case SubscriptionStatus.CANCELED:
        return "Your subscription has been canceled";
      case SubscriptionStatus.PAST_DUE:
        return "Payment issue detected";
      case SubscriptionStatus.UNPAID:
        return "Your account is past due";
      default:
        return "Action required";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>{getTitle()}</DialogTitle>
        <p className="text-muted-foreground">
          Please update your billing information to continue using all features.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Later
          </Button>
          <Button asChild>
            <Link href={`/dashboard/${orgId}/billing`}>Update Billing</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
