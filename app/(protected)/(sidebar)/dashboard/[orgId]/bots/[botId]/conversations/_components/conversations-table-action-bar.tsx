"use client";

import type { Conversation } from "@/lib/generated/prisma";
import type { Table } from "@tanstack/react-table";
import { CheckCircle2, Download, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTableActionBar } from "@/components/data-table/data-table-action-bar";
import { DataTableActionBarAction } from "@/components/data-table/data-table-action-bar";
import { DataTableActionBarSelection } from "@/components/data-table/data-table-action-bar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { exportTableToCSV } from "../_lib/utils";
import {
  completeConversation,
  activateConversation,
  failConversation,
  abandonConversation,
} from "@/app/actions/conversation-tracking";

type Action = "update-status" | "export" | "delete";

interface ConversationsTableActionBarProps {
  table: Table<Conversation>;
}

export function ConversationsTableActionBar({
  table,
}: ConversationsTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;
  const [isPending, startTransition] = React.useTransition();
  const [currentAction, setCurrentAction] = React.useState<Action | null>(null);

  const getIsActionPending = React.useCallback(
    (action: Action) => isPending && currentAction === action,
    [isPending, currentAction]
  );

  const onStatusUpdate = React.useCallback(
    async (status: string) => {
      setCurrentAction("update-status");
      startTransition(async () => {
        let successCount = 0;

        for (const row of rows) {
          const conversation = row.original;
          // Skip if conversation is already in the desired status
          if (conversation.status === status) continue;

          let result;

          switch (status) {
            case "ACTIVE":
              result = await activateConversation(conversation.id);
              break;
            case "COMPLETED":
              result = await completeConversation(conversation.id);
              break;
            case "FAILED":
              result = await failConversation(conversation.id);
              break;
            case "ABANDONED":
              result = await abandonConversation(conversation.id);
              break;
            default:
              continue;
          }

          if (result.success) {
            successCount++;
          }
        }

        if (successCount > 0) {
          const statusLabel =
            status.charAt(0).toLowerCase() + status.slice(1).toLowerCase();
          toast.success(
            `${successCount} conversation(s) marked as ${statusLabel}`
          );
        } else {
          toast.info("No conversations were updated");
        }
      });
    },
    [rows]
  );

  const onConversationExport = React.useCallback(() => {
    setCurrentAction("export");
    startTransition(() => {
      exportTableToCSV(table, {
        excludeColumns: ["select", "actions"],
        onlySelected: true,
      });
    });
  }, [table]);

  const onConversationDelete = React.useCallback(() => {
    setCurrentAction("delete");
    // This would require a deleteConversations action
    toast.info("Delete functionality not implemented yet");
  }, []);

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <Select onValueChange={(value) => onStatusUpdate(value)}>
          <SelectTrigger disabled={getIsActionPending("update-status")}>
            {getIsActionPending("update-status") ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-t-transparent border-current" />
                <span>Updating...</span>
              </span>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Update status</span>
              </>
            )}
          </SelectTrigger>
          <SelectContent align="center">
            <SelectGroup>
              <SelectItem key="ACTIVE" value="ACTIVE" className="capitalize">
                Mark as active
              </SelectItem>
              <SelectItem
                key="COMPLETED"
                value="COMPLETED"
                className="capitalize"
              >
                Mark as completed
              </SelectItem>
              <SelectItem key="FAILED" value="FAILED" className="capitalize">
                Mark as failed
              </SelectItem>
              <SelectItem
                key="ABANDONED"
                value="ABANDONED"
                className="capitalize"
              >
                Mark as abandoned
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <DataTableActionBarAction
          size="icon"
          tooltip="Export conversations"
          isPending={getIsActionPending("export")}
          onClick={onConversationExport}
        >
          <Download />
        </DataTableActionBarAction>
        <DataTableActionBarAction
          size="icon"
          tooltip="Delete conversations"
          isPending={getIsActionPending("delete")}
          onClick={onConversationDelete}
        >
          <Trash2 />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
