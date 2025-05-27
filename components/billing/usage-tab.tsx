"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface UsageData {
  featureName: string;
  usage: number;
  limit: number;
}

export interface CreditPack {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  externalId: string;
}

interface CreditUsageData {
  planAllocation: number;
  planUsed: number;
  additionalBalance: number;
}

interface UsageTabProps {
  usageData: UsageData[];
  creditBalance: number;
  onPurchaseCredits: (quantity: number) => void;
  creditUsageData?: CreditUsageData;
}

export function UsageTab({
  usageData,
  creditBalance,
  onPurchaseCredits,
  creditUsageData,
}: UsageTabProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Credit and pricing calculations
  const creditsPerPack = 1000;
  const pricePerPack = 15;
  const totalCredits = creditsPerPack * quantity;
  const totalPrice = pricePerPack * quantity;

  const handlePurchaseClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmPurchase = () => {
    onPurchaseCredits(quantity);
    setShowConfirmDialog(false);
  };

  // Helper function to get a more user-friendly display name
  const getDisplayName = (featureName: string): string => {
    const displayNames: Record<string, string> = {
      agents: "AI Agents",
      message_credits: "Message Credits",
    };

    return displayNames[featureName] || featureName.replace(/_/g, " ");
  };

  // Helper function to get description for each resource
  const getResourceDescription = (featureName: string): string => {
    const descriptions: Record<string, string> = {
      agents: "Number of AI agents you can create and manage",
      message_credits: "Credits available for AI message generation",
    };

    return descriptions[featureName] || "";
  };

  // Adjust usage data for message_credits if creditUsageData is available
  const adjustedUsageData = usageData.map((item) => {
    if (item.featureName === "message_credits" && creditUsageData) {
      return {
        ...item,
        // Use planUsed for the usage value
        usage: creditUsageData.planUsed,
        // Use planAllocation + additionalBalance for the limit
        limit:
          creditUsageData.planAllocation + creditUsageData.additionalBalance,
      };
    }
    return item;
  });

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
            {adjustedUsageData.map((item) => (
              <div key={item.featureName} className="space-y-3 pb-4">
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium text-lg">
                      {getDisplayName(item.featureName)}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getResourceDescription(item.featureName)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">
                      {item.usage}{" "}
                      <span className="text-muted-foreground font-normal">
                        / {item.limit}
                      </span>
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round((item.usage / (item.limit || 1)) * 100)}% used
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.usage / (item.limit || 1) > 0.9
                        ? "bg-destructive"
                        : item.usage / (item.limit || 1) > 0.7
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (item.usage / (item.limit || 1)) * 100
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

            {creditUsageData && (
              <div className="space-y-2 border p-4 rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Plan allocation</span>
                  <span className="text-sm font-medium">
                    {creditUsageData.planAllocation.toLocaleString()} credits
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Used from plan</span>
                  <span className="text-sm font-medium">
                    {creditUsageData.planUsed.toLocaleString()} credits
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Additional purchased credits</span>
                  <span className="text-sm font-medium">
                    {creditUsageData.additionalBalance.toLocaleString()} credits
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Total remaining</span>
                  <span className="text-sm font-medium">
                    {creditBalance.toLocaleString()} credits
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-6 pt-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Purchase Message Credits</Label>
                  <span className="text-sm font-medium">
                    {quantity} pack{quantity > 1 ? "s" : ""}
                  </span>
                </div>
                <Slider
                  value={[quantity]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setQuantity(value[0])}
                  className="mb-4"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>1 pack</span>
                  <span>10 packs</span>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex justify-between items-center mb-2">
                  <span>Price per pack</span>
                  <span>${pricePerPack.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>Credits per pack</span>
                  <span>{creditsPerPack.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>Quantity</span>
                  <span>{quantity}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t font-bold">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                  <span>Total credits</span>
                  <span>{totalCredits.toLocaleString()}</span>
                </div>
              </div>

              <Button onClick={handlePurchaseClick} className="w-full">
                Purchase Message Credits
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase message credits:
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Message Credits Pack</span>
              <span className="font-medium">
                ${pricePerPack.toFixed(2)} per pack
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>Quantity</span>
              <span>
                {quantity} pack{quantity > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>Credits</span>
              <span>{totalCredits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-bold">Total</span>
              <span className="font-bold">${totalPrice.toFixed(2)}</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              After payment is complete, the credits will be added to your
              account balance.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmPurchase}>Confirm Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
