"use client";

import type { Conversation } from "@/lib/generated/prisma";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { useAction } from "next-safe-action/hooks";

import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
// import { useFeatureFlags } from "./feature-flags-provider";
import { ConversationsTableActionBar } from "./conversations-table-action-bar";
import { getConversationsTableColumns } from "./conversations-table-columns";
import { ConversationsTableToolbarActions } from "./conversations-table-toolbar-actions";
import { DeleteConversationsDialog } from "./delete-conversations-dialog";
import { getSources } from "../actions";
import { useDataTable } from "../_lib/hooks";
import { DataTableRowAction } from "../_lib/types";
import { toast } from "sonner";

interface ConversationsTableProps {
  botId: string;
  promises: Promise<
    [
      { data: Conversation[]; pageCount: number },
      Record<Conversation["status"], number>
    ]
  >;
}

export function ConversationsTable({
  botId,
  promises,
}: ConversationsTableProps) {
  //   const { enableAdvancedFilter, filterFlag } = useFeatureFlags();
  const enableAdvancedFilter = false;
  const filterFlag = "advancedFilters";
  const [sources, setSources] = React.useState<string[]>([]);

  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<Conversation> | null>(null);

  // Use the useAction hook for sources
  const { execute, result } = useAction(getSources);

  // Fetch sources for filter options
  React.useEffect(() => {
    const loadSources = async () => {
      execute({ botId });
    };

    loadSources();
  }, [botId, execute]);

  // Update sources state when result changes
  React.useEffect(() => {
    if (result?.data?.success) {
      setSources(result.data.data || []);
    } else if (result?.serverError) {
      toast.error("Failed to load conversation sources");
      console.error("Error fetching sources:", result.serverError);
    }
  }, [result]);

  const [{ data, pageCount }, statusCounts] = React.use(promises);

  const columns = React.useMemo(
    () =>
      getConversationsTableColumns({
        botId,
        statusCounts,
        sources,
        setRowAction,
      }),
    [botId, statusCounts, sources]
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "startedAt", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (originalRow: Conversation) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <>
      <DataTable
        table={table}
        actionBar={<ConversationsTableActionBar table={table} />}
      >
        {enableAdvancedFilter ? (
          <DataTableAdvancedToolbar table={table}>
            <DataTableSortList table={table} align="start" />
            {filterFlag === "advancedFilters" ? (
              <DataTableFilterList
                table={table}
                shallow={shallow}
                debounceMs={debounceMs}
                throttleMs={throttleMs}
                align="start"
              />
            ) : (
              <DataTableFilterMenu
                table={table}
                shallow={shallow}
                debounceMs={debounceMs}
                throttleMs={throttleMs}
              />
            )}
          </DataTableAdvancedToolbar>
        ) : (
          <DataTableToolbar table={table}>
            <ConversationsTableToolbarActions table={table} />
            <DataTableSortList table={table} align="end" />
          </DataTableToolbar>
        )}
      </DataTable>

      <DeleteConversationsDialog
        open={rowAction?.variant === "delete" || false}
        onOpenChange={() => setRowAction(null)}
        conversations={rowAction?.row.original ? [rowAction?.row.original] : []}
        showTrigger={false}
        onSuccess={() => rowAction?.row.toggleSelected(false)}
      />
    </>
  );
}
