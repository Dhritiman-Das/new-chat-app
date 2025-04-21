"use client";

import type { Conversation } from "@/lib/generated/prisma";
import type { Table } from "@tanstack/react-table";
import { Icons } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { exportTableToCSV } from "../_lib/utils";

import { DeleteConversationsDialog } from "./delete-conversations-dialog";

interface ConversationsTableToolbarActionsProps {
  table: Table<Conversation>;
}

export function ConversationsTableToolbarActions({
  table,
}: ConversationsTableToolbarActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {table.getFilteredSelectedRowModel().rows.length > 0 ? (
        <DeleteConversationsDialog
          conversations={table
            .getFilteredSelectedRowModel()
            .rows.map((row) => row.original)}
          onSuccess={() => table.toggleAllRowsSelected(false)}
        />
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          exportTableToCSV(table, {
            filename: "conversations",
            excludeColumns: ["select", "actions"],
          })
        }
      >
        <Icons.Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );
}
