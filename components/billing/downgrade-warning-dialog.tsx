"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";

interface DowngradeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  currentActiveBots: number;
  newPlanLimit: number;
  botsToDeactivate: number;
  botNamesToDeactivate: string[];
  onConfirm: () => void;
  loading?: boolean;
}

export function DowngradeWarningDialog({
  open,
  onOpenChange,
  planName,
  currentActiveBots,
  newPlanLimit,
  botsToDeactivate,
  botNamesToDeactivate,
  onConfirm,
  loading = false,
}: DowngradeWarningDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <Icons.Warning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            Plan Downgrade
          </DialogTitle>
          <DialogDescription className="text-base">
            Switching to <span className="font-medium">{planName}</span> will
            reduce your bot limit and automatically deactivate some bots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bot Limits Comparison */}
          <div className="rounded-lg border bg-card p-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{currentActiveBots}</div>
                <div className="text-sm text-muted-foreground">
                  Current bots
                </div>
              </div>
              <div className="flex justify-center">
                <Icons.ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {newPlanLimit === -1 ? "∞" : newPlanLimit}
                </div>
                <div className="text-sm text-muted-foreground">New limit</div>
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                <Icons.Warning className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-medium">
                  {botsToDeactivate} bot{botsToDeactivate !== 1 ? "s" : ""} will
                  be deactivated
                </div>
                <div className="text-sm text-muted-foreground">
                  The most recently created bots will be deactivated first
                </div>
              </div>
            </div>
          </div>

          {/* Bots to be deactivated */}
          {botNamesToDeactivate.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">Bots to be deactivated</h4>
                <Badge variant="outline" className="text-xs">
                  {botNamesToDeactivate.length}
                </Badge>
              </div>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
                {botNamesToDeactivate.map((botName, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md bg-background px-3 py-2 shadow-sm"
                  >
                    <span className="text-sm font-medium">{botName}</span>
                    <Badge variant="secondary" className="text-xs">
                      Deactivating
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Alternative suggestion */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Icons.Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-sm">
                <div className="font-medium mb-1">Tip</div>
                <div className="text-muted-foreground">
                  Manually deactivate {botsToDeactivate} bot
                  {botsToDeactivate !== 1 ? "s" : ""} before downgrading to
                  choose which ones remain active.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 pt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {loading ? (
              <>
                <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />
                Downgrading...
              </>
            ) : (
              `Downgrade to ${planName}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
