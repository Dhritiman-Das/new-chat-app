"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { updateGoHighLevelAccessCode } from "@/app/actions/gohighlevel";

interface GoHighLevelAccessCodeFormProps {
  integrationId: string;
  deploymentId?: string;
  currentAccessCode?: string;
}

export function GoHighLevelAccessCodeForm({
  integrationId,
  deploymentId,
  currentAccessCode = "",
}: GoHighLevelAccessCodeFormProps) {
  const [accessCode, setAccessCode] = useState(currentAccessCode);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveAccessCode = async () => {
    try {
      setIsUpdating(true);

      const result = await updateGoHighLevelAccessCode({
        integrationId,
        deploymentId,
        accessCode: accessCode.trim() || undefined,
      });

      if (result?.data?.success) {
        toast.success("Access code updated successfully");
      } else {
        const errorMsg =
          result?.data?.error?.message || "Failed to update access code";
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error updating access code:", error);
      toast.error("Failed to update access code. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Message Access Code</CardTitle>
        <CardDescription>
          Configure an access code that must be present in messages for the bot
          to respond. Leave empty to allow all messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accessCode">Access Code</Label>
          <Input
            id="accessCode"
            type="text"
            placeholder="Enter access code (optional)"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="max-w-md"
          />
          <p className="text-sm text-muted-foreground">
            If configured, only messages containing this code will trigger bot
            responses. For example, if you set &ldquo;BOT123&rdquo;, only
            messages containing &ldquo;BOT123&rdquo; will be processed.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveAccessCode} disabled={isUpdating}>
          {isUpdating ? (
            <>
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Icons.Check className="mr-2 h-4 w-4" />
              Save Access Code
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
