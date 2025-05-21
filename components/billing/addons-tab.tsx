"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AddOn {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface AddOnsTabProps {
  addOns: AddOn[];
  onUpdateAddOnQuantity: (addOnId: string, quantity: number) => void;
  onRemoveAddOn: (addOnId: string) => void;
  onAddAddOn: (addOnId: string, quantity: number) => void;
}

export function AddOnsTab({
  addOns,
  onUpdateAddOnQuantity,
  onRemoveAddOn,
  onAddAddOn,
}: AddOnsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Add-ons</CardTitle>
          <CardDescription>Manage your current add-ons</CardDescription>
        </CardHeader>
        <CardContent>
          {addOns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Add-on</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addOns.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell className="font-medium">{addon.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onUpdateAddOnQuantity(
                              addon.id,
                              Math.max(1, addon.quantity - 1)
                            )
                          }
                          disabled={addon.quantity <= 1}
                        >
                          -
                        </Button>
                        <span>{addon.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onUpdateAddOnQuantity(addon.id, addon.quantity + 1)
                          }
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      ${addon.unitPrice * addon.quantity}/month
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemoveAddOn(addon.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No active add-ons
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Add-ons</CardTitle>
          <CardDescription>
            Enhance your subscription with additional resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Additional Agent</CardTitle>
                <CardDescription>Add more agents to your plan</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  $10{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    /agent/month
                  </span>
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => onAddAddOn("addon_agent", 1)}>
                  Add Agent
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Message Credits Pack</CardTitle>
                <CardDescription>
                  1,000 additional message credits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  $15{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    /pack
                  </span>
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => onAddAddOn("addon_credits", 1)}>
                  Purchase Pack
                </Button>
              </CardFooter>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
