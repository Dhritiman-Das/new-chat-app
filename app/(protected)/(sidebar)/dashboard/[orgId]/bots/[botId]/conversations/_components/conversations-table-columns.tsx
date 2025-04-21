"use client";

import type { Conversation } from "@/lib/generated/prisma";
import type { DataTableRowAction } from "@/lib/types/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarIcon,
  CircleDashed,
  Clock,
  Ellipsis,
  MessageSquare,
  Hammer as Tool,
  User,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";

import { formatDuration, formatSource, getStatusIcon } from "../_lib/utils";
import {
  abandonConversation,
  activateConversation,
  completeConversation,
  failConversation,
} from "@/app/actions/conversation-tracking";

// Add interface for Conversation with count property
interface ConversationWithCount extends Conversation {
  _count?: {
    messages: number;
    toolExecutions: number;
  };
}

interface GetConversationsTableColumnsProps {
  botId: string;
  statusCounts: Record<Conversation["status"], number>;
  sources: string[];
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Conversation> | null>
  >;
}

export function getConversationsTableColumns({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  botId,
  statusCounts,
  sources,
  setRowAction,
}: GetConversationsTableColumnsProps): ColumnDef<ConversationWithCount>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "id",
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => {
        const id = row.original.id;
        // Get first 8 characters of ID
        const shortId = id.substring(0, 8);
        return <div className="w-28 font-mono text-xs">{shortId}...</div>;
      },
      enableSorting: false,
    },
    {
      id: "source",
      accessorKey: "source",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" />
      ),
      cell: ({ row }) => {
        const source = row.original.source;
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[12rem] truncate font-medium">
              {formatSource(source)}
            </span>
          </div>
        );
      },
      meta: {
        label: "Source",
        placeholder: "Filter by source...",
        variant: "multiSelect",
        options: sources.map((source) => ({
          label: formatSource(source),
          value: source,
          count: 0, // This would need to be updated with actual counts
        })),
        icon: User,
      },
      enableColumnFilter: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ cell }) => {
        const status = cell.getValue<Conversation["status"]>();
        if (!status) return null;

        const Icon = getStatusIcon(status);

        return (
          <Badge variant="outline" className="py-1 [&>svg]:size-3.5">
            <Icon className="mr-1" />
            <span className="capitalize">{status.toLowerCase()}</span>
          </Badge>
        );
      },
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: Object.keys(statusCounts).map((status) => ({
          label: status.charAt(0).toLowerCase() + status.slice(1).toLowerCase(),
          value: status,
          count: statusCounts[status as Conversation["status"]],
          icon: getStatusIcon(status as Conversation["status"]),
        })),
        icon: CircleDashed,
      },
      enableColumnFilter: true,
    },
    {
      id: "messages",
      accessorKey: "_count.messages",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Messages" />
      ),
      cell: ({ row }) => {
        const count = row.original._count?.messages || 0;
        return (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
      meta: {
        label: "Messages",
        icon: MessageSquare,
      },
    },
    {
      id: "tools",
      accessorKey: "_count.toolExecutions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tool Uses" />
      ),
      cell: ({ row }) => {
        const count = row.original._count?.toolExecutions || 0;
        return (
          <div className="flex items-center gap-2">
            <Tool className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
      meta: {
        label: "Tool Uses",
        icon: Tool,
      },
    },
    {
      id: "duration",
      accessorFn: (row) => {
        const startDate = row.startedAt;
        const endDate = row.endedAt;
        if (!endDate) return 0; // Ongoing
        return endDate.getTime() - startDate.getTime();
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration" />
      ),
      cell: ({ row }) => {
        const startDate = row.original.startedAt;
        const endDate = row.original.endedAt;
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatDuration(startDate, endDate)}</span>
          </div>
        );
      },
      meta: {
        label: "Duration",
        icon: Clock,
      },
    },
    {
      id: "startedAt",
      accessorKey: "startedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Started" />
      ),
      cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      meta: {
        label: "Started",
        variant: "dateRange",
        icon: CalendarIcon,
      },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: function Cell({ row }) {
        const [isCompletePending, startCompleteTransition] =
          React.useTransition();
        const [isAbandonPending, startAbandonTransition] =
          React.useTransition();
        const [isFailedPending, startFailedTransition] = React.useTransition();
        const [isActivePending, startActiveTransition] = React.useTransition();
        const conversation = row.original;
        const isActive = conversation.status === "ACTIVE";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open menu"
                variant="ghost"
                className="flex size-8 p-0 data-[state=open]:bg-muted"
              >
                <Ellipsis className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, variant: "view" })}
              >
                View Conversation
              </DropdownMenuItem>
              {isActive && (
                <>
                  <DropdownMenuItem
                    disabled={isActivePending}
                    onSelect={() => {
                      startActiveTransition(async () => {
                        const result = await activateConversation(
                          conversation.id
                        );
                        if (result.success) {
                          toast.success("Conversation marked as active");
                        } else {
                          toast.error("Failed to mark conversation as active");
                        }
                      });
                    }}
                  >
                    Mark as Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isCompletePending}
                    onSelect={() => {
                      startCompleteTransition(async () => {
                        const result = await completeConversation(
                          conversation.id
                        );
                        if (result.success) {
                          toast.success("Conversation marked as completed");
                        } else {
                          toast.error("Failed to complete conversation");
                        }
                      });
                    }}
                  >
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isFailedPending}
                    onSelect={() => {
                      startFailedTransition(async () => {
                        const result = await failConversation(conversation.id);
                        if (result.success) {
                          toast.success("Conversation marked as failed");
                        } else {
                          toast.error("Failed to mark conversation as failed");
                        }
                      });
                    }}
                  >
                    Mark as Failed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isAbandonPending}
                    onSelect={() => {
                      startAbandonTransition(async () => {
                        const result = await abandonConversation(
                          conversation.id
                        );
                        if (result.success) {
                          toast.success("Conversation marked as abandoned");
                        } else {
                          toast.error(
                            "Failed to mark conversation as abandoned"
                          );
                        }
                      });
                    }}
                  >
                    Mark as Abandoned
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, variant: "delete" })}
                className="text-destructive focus:text-destructive"
              >
                Delete
                <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 40,
    },
  ];
}
