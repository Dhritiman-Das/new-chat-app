import type { Row } from "@tanstack/react-table";

/**
 * A type representing a row action in a data table.
 * This is used to track row-specific actions like viewing, updating, or deleting.
 */
export interface DataTableRowAction<TData> {
  row: Row<TData>;
  variant: "view" | "update" | "delete";
}

/**
 * Export table to CSV options
 */
export interface ExportTableToCSVOptions {
  filename?: string;
  excludeColumns?: string[];
  onlySelected?: boolean;
}

/**
 * Search params used in URL parameters
 */
export type SearchParams = Record<string, string | string[] | undefined>;
