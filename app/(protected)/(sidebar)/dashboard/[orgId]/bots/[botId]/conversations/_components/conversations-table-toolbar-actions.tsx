"use client";

import type { Conversation } from "@/lib/generated/prisma";
import type { Table } from "@tanstack/react-table";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import * as React from "react";

import { exportTableToCSV } from "../_lib/utils";

import { DeleteConversationsDialog } from "./delete-conversations-dialog";

interface ConversationsTableToolbarActionsProps {
  table: Table<Conversation>;
}

export function ConversationsTableToolbarActions({
  table,
}: ConversationsTableToolbarActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchValue = searchParams?.get("search") || "";

  // Debounced search handler
  const debouncedSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString());

    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }

    // Reset to first page when searching
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, 500);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(event.target.value);
  };

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("search");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative">
        <Icons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by ID or message..."
          className="w-64 pl-8"
          defaultValue={searchValue}
          onChange={handleSearchChange}
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-6 w-6 p-0"
            onClick={clearSearch}
          >
            <Icons.X className="h-3 w-3" />
          </Button>
        )}
      </div>
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
