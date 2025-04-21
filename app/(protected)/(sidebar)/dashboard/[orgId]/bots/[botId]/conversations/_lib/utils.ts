import { Icons } from "@/components/icons";
import { type ConversationStatus } from "@/lib/generated/prisma";
import type { Table } from "@tanstack/react-table";
import type { ExportTableToCSVOptions } from "./types";

/**
 * Get the appropriate icon for a conversation status
 */
export function getStatusIcon(status: ConversationStatus) {
  return {
    ACTIVE: Icons.MessageCircle,
    COMPLETED: Icons.Circle,
    FAILED: Icons.CircleOff,
    ABANDONED: Icons.Clock,
  }[status];
}

/**
 * Format source names for display
 */
export function formatSource(source: string | null): string {
  if (!source) return "Unknown";

  // Convert "snake_case" or "kebab-case" to "Title Case"
  return source.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format date to a readable format
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(dateObj);
}

/**
 * Format duration from two dates
 */
export function formatDuration(
  startDate: Date | string,
  endDate: Date | string | null
): string {
  if (!endDate) return "Ongoing";

  const startDateObj =
    typeof startDate === "string" ? new Date(startDate) : startDate;
  const endDateObj = typeof endDate === "string" ? new Date(endDate) : endDate;

  const durationMs = endDateObj.getTime() - startDateObj.getTime();
  const durationSec = Math.floor(durationMs / 1000);

  if (durationSec < 60) {
    return `${durationSec}s`;
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${mins}m`;
}

/**
 * Get the appropriate icon for sentiment
 */
export function getSentimentIcon(sentiment: number | null) {
  if (sentiment === null) return null;

  if (sentiment > 0.2) return Icons.ArrowUp;
  if (sentiment < -0.2) return Icons.ArrowDown;
  return null;
}

/**
 * Export table data to CSV
 */
export function exportTableToCSV<T>(
  table: Table<T>,
  options: ExportTableToCSVOptions = {}
) {
  const {
    filename = "export",
    excludeColumns = [],
    onlySelected = false,
  } = options;

  // Get visible columns that we want to export
  const headers = table
    .getAllColumns()
    .filter(
      (column) =>
        column.getCanHide() &&
        column.getIsVisible() &&
        !excludeColumns.includes(column.id)
    )
    .map((column) => {
      const header = column.columnDef.header;
      return typeof header === "string" ? header : column.id;
    });

  // Get the rows we want to export
  const rows = onlySelected
    ? table.getSelectedRowModel().rows
    : table.getRowModel().rows;

  // Create CSV content
  let csv = headers.join(",") + "\n";

  rows.forEach((row) => {
    const values = table
      .getAllColumns()
      .filter(
        (column) =>
          column.getCanHide() &&
          column.getIsVisible() &&
          !excludeColumns.includes(column.id)
      )
      .map((column) => {
        const cellValue = row.getValue(column.id);

        // Convert value to string and handle special cases
        let valueStr =
          cellValue === null || cellValue === undefined
            ? ""
            : String(cellValue);

        // Escape quotes and wrap in quotes if it contains a comma
        if (
          valueStr.includes(",") ||
          valueStr.includes('"') ||
          valueStr.includes("\n")
        ) {
          valueStr = '"' + valueStr.replace(/"/g, '""') + '"';
        }

        return valueStr;
      });

    csv += values.join(",") + "\n";
  });

  // Create and download the file
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse filters to a valid object format
 */
export function getValidFilters<T>(
  filtersStr: string | object | undefined
): T | undefined {
  if (!filtersStr) return undefined;

  try {
    // If filtersStr is already an object, return it
    if (typeof filtersStr === "object") {
      return filtersStr as T;
    }

    // Otherwise parse it as a string
    return JSON.parse(filtersStr) as T;
  } catch (error) {
    console.error("Error parsing filters:", error);
    return undefined;
  }
}
