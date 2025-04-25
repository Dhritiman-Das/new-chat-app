"use client";

import { Icons } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Lead } from "./types";

interface LeadDetailsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  lead: Lead | null;
  orgId: string;
  botId: string;
}

export function LeadDetailsDialog({
  isOpen,
  setIsOpen,
  lead,
  orgId,
  botId,
}: LeadDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
          <DialogDescription>
            All captured information for this lead
          </DialogDescription>
        </DialogHeader>
        {lead && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">
                  {lead.name || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {lead.email || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">
                  {lead.phone || "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Company</p>
                <p className="text-sm text-muted-foreground">
                  {lead.company || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Source</p>
                <p className="text-sm text-muted-foreground">
                  {lead.source || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {lead.status || "—"}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Trigger Keyword</p>
              <p className="text-sm text-muted-foreground">
                {lead.triggerKeyword || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Date Captured</p>
              <p className="text-sm text-muted-foreground">
                {new Date(lead.createdAt).toLocaleString()}
              </p>
            </div>

            {lead.conversationId && (
              <div className="mt-2">
                <Link
                  href={`/dashboard/${orgId}/bots/${botId}/conversations/${lead.conversationId}`}
                  target="_blank"
                  className="flex items-center hover:underline text-sm"
                >
                  Check conversation
                  <Icons.ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Custom Properties */}
            {lead.properties && Object.keys(lead.properties).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Custom Properties</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(lead.properties).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-medium capitalize">{key}</p>
                        <p className="text-sm text-muted-foreground">
                          {value === null || value === undefined
                            ? "—"
                            : typeof value === "object"
                            ? value
                              ? JSON.stringify(value)
                              : "—"
                            : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            {lead.metadata && Object.keys(lead.metadata).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Metadata</h4>
                  <pre className="bg-secondary/50 p-4 rounded-md overflow-auto text-xs">
                    {JSON.stringify(lead.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
