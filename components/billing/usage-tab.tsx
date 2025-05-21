"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface UsageData {
  featureName: string;
  usage: number;
  limit: number;
}

interface UsageTabProps {
  usageData: UsageData[];
  creditBalance: number;
  onPurchaseCredits: () => void;
}

export function UsageTab({
  usageData,
  creditBalance,
  onPurchaseCredits,
}: UsageTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>
            Monitor your current usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {usageData.map((item) => (
              <div key={item.featureName} className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium capitalize">
                    {item.featureName.replace("_", " ")}
                  </span>
                  <span>
                    {item.usage} / {item.limit}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.usage / item.limit > 0.9
                        ? "bg-destructive"
                        : item.usage / item.limit > 0.7
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (item.usage / item.limit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Credits</CardTitle>
          <CardDescription>
            Your current message credit balance and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Current Balance</span>
              <span className="text-2xl font-bold">{creditBalance}</span>
            </div>

            <Button onClick={onPurchaseCredits}>
              Purchase Additional Credits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
