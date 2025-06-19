"use client";

import type { Conversation } from "@/lib/generated/prisma";
import type { DataTableRowAction } from "@/lib/types/data-table";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Icons } from "@/components/icons";
import * as React from "react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

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

import { formatSource, getStatusIcon } from "../_lib/utils";
import {
  abandonConversation,
  activateConversation,
  completeConversation,
  failConversation,
  pauseConversation,
  resumeConversation,
} from "@/app/actions/conversation-tracking";
import Link from "next/link";

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
  botId,
  statusCounts,
  sources,
  setRowAction,
}: GetConversationsTableColumnsProps): ColumnDef<ConversationWithCount>[] {
  // Create a hook for navigation inside components
  const ConversationActionCell = ({
    row,
  }: {
    row: Row<ConversationWithCount>;
  }) => {
    const pathname = usePathname();
    const conversation = row.original;
    const [isCompletePending, startCompleteTransition] = React.useTransition();
    const [isAbandonPending, startAbandonTransition] = React.useTransition();
    const [isFailedPending, startFailedTransition] = React.useTransition();
    const [isActivePending, startActiveTransition] = React.useTransition();
    const [isPausePending, startPauseTransition] = React.useTransition();
    const [isResumePending, startResumeTransition] = React.useTransition();

    // Optimistic state for pause status
    const [optimisticIsPaused, setOptimisticIsPaused] = React.useState(
      conversation.isPaused || false
    );

    // Sync optimistic state when conversation data changes
    React.useEffect(() => {
      setOptimisticIsPaused(conversation.isPaused || false);
    }, [conversation.isPaused]);

    const isActive = conversation.status === "ACTIVE";

    // Extract orgId and botId from the current path
    const pathSegments = pathname.split("/");
    const orgIdIndex = pathSegments.indexOf("dashboard") + 1;
    const orgId = pathSegments[orgIdIndex];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open menu"
            variant="ghost"
            className="flex size-8 p-0 data-[state=open]:bg-muted"
          >
            <Icons.Ellipsis className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/${orgId}/bots/${botId}/conversations/${conversation.id}`}
            >
              View Conversation
            </Link>
          </DropdownMenuItem>
          {isActive && (
            <>
              <DropdownMenuItem
                disabled={isActivePending}
                onSelect={() => {
                  startActiveTransition(async () => {
                    const result = await activateConversation(conversation.id);
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
                    const result = await completeConversation(conversation.id);
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
                    const result = await abandonConversation(conversation.id);
                    if (result.success) {
                      toast.success("Conversation marked as abandoned");
                    } else {
                      toast.error("Failed to mark conversation as abandoned");
                    }
                  });
                }}
              >
                Mark as Abandoned
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          {optimisticIsPaused ? (
            <DropdownMenuItem
              disabled={isResumePending}
              onSelect={() => {
                startResumeTransition(async () => {
                  // Optimistically update the state
                  setOptimisticIsPaused(false);

                  const result = await resumeConversation(conversation.id);
                  if (result.success) {
                    toast.success(
                      "Conversation resumed - bot can respond again"
                    );
                  } else {
                    // Revert optimistic update on failure
                    setOptimisticIsPaused(true);
                    toast.error("Failed to resume conversation");
                  }
                });
              }}
            >
              Resume Bot Responses
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isPausePending}
              onSelect={() => {
                startPauseTransition(async () => {
                  // Optimistically update the state
                  setOptimisticIsPaused(true);

                  const result = await pauseConversation(conversation.id);
                  if (result.success) {
                    toast.success(
                      "Conversation paused - bot won't respond to new messages"
                    );
                  } else {
                    // Revert optimistic update on failure
                    setOptimisticIsPaused(false);
                    toast.error("Failed to pause conversation");
                  }
                });
              }}
            >
              Pause Bot Responses
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setRowAction({ row, variant: "delete" });
            }}
            className="text-destructive focus:text-destructive"
          >
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

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
        const isPaused = row.original.isPaused;
        // Get first 8 characters of ID
        const shortId = id.substring(0, 8);
        return (
          <div className="flex items-center gap-2">
            <div className="w-28 font-mono text-xs">{shortId}...</div>
            {isPaused && (
              <Badge variant="secondary" className="text-xs">
                Paused
              </Badge>
            )}
          </div>
        );
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
        icon: Icons.User,
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
        icon: Icons.CircleDashed,
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
            <Icons.MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
      meta: {
        label: "Messages",
        icon: Icons.MessageSquare,
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
            <Icons.Hammer className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
      meta: {
        label: "Tool Uses",
        icon: Icons.Hammer,
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
        icon: Icons.CalendarIcon,
      },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => <ConversationActionCell row={row} />,
      size: 40,
    },
  ];
}
