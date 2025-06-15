import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce, useThrottle } from "@uidotdev/usehooks";

interface UseDataTableProps<TData, TValue> {
  /**
   * The data for the table
   */
  data: TData[];

  /**
   * The columns definition for the table
   */
  columns: ColumnDef<TData, TValue>[];

  /**
   * The total number of pages
   */
  pageCount?: number;

  /**
   * A function to get a unique identifier for each row
   */
  getRowId?: (row: TData) => string;

  /**
   * Initial state for the table
   */
  initialState?: {
    pagination?: {
      pageIndex?: number;
      pageSize?: number;
    };
    sorting?: SortingState;
    columnVisibility?: VisibilityState;
    columnPinning?: {
      left?: string[];
      right?: string[];
    };
  };

  /**
   * Enable advanced filtering
   */
  enableAdvancedFilter?: boolean;

  /**
   * Options for persisting state in URL
   */
  shallow?: boolean;
  clearOnDefault?: boolean;

  /**
   * Debounce time for search input in milliseconds
   */
  debounceMs?: number;

  /**
   * Throttle time for range inputs in milliseconds
   */
  throttleMs?: number;
}

/**
 * A hook for creating a data table with URL state persistence
 */
export function useDataTable<TData, TValue>({
  data,
  columns,
  pageCount = 0,
  getRowId,
  initialState,
  shallow = true,
  //   clearOnDefault = false,
  debounceMs = 500,
  throttleMs = 500,
}: UseDataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-based state
  const page = searchParams?.get("page") ? Number(searchParams.get("page")) : 1;
  const per_page = searchParams?.get("per_page")
    ? Number(searchParams.get("per_page"))
    : 10;

  const sort = searchParams?.get("sort") || undefined;
  const filters = searchParams?.get("filters") || undefined;

  // Create URL search params
  const createQueryString = React.useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString());

      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      }

      return newSearchParams.toString();
    },
    [searchParams]
  );

  // Parse sorting from URL
  const sorting = React.useMemo<SortingState>(() => {
    if (!sort) return initialState?.sorting || [];

    const [id, dir] = sort.split(":");
    return [{ id, desc: dir === "desc" }];
  }, [sort, initialState?.sorting]);

  // Set up column filters state
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  // Initialize column filters from URL
  React.useEffect(() => {
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        const columnFiltersFromURL: ColumnFiltersState = [];

        // Convert URL filters to column filter format
        for (const [id, value] of Object.entries(parsedFilters)) {
          if (value !== undefined && value !== null) {
            // Special handling for date range filters (startedAt)
            if (
              id === "startedAt" &&
              typeof value === "object" &&
              !Array.isArray(value)
            ) {
              const dateRange = value as { from?: string; to?: string };
              const timestamps: (number | undefined)[] = [];

              if (dateRange.from) {
                timestamps[0] = new Date(dateRange.from).getTime();
              }
              if (dateRange.to) {
                timestamps[1] = new Date(dateRange.to).getTime();
              }

              if (timestamps.length > 0) {
                columnFiltersFromURL.push({ id, value: timestamps });
              }
            } else {
              columnFiltersFromURL.push({ id, value });
            }
          }
        }

        setColumnFilters(columnFiltersFromURL);
      } catch (error) {
        console.error("Error parsing filters from URL:", error);
      }
    } else {
      setColumnFilters([]);
    }
  }, [filters]);

  // Set up pagination state
  const pagination = React.useMemo<PaginationState>(
    () => ({
      pageIndex: page - 1,
      pageSize: per_page,
    }),
    [page, per_page]
  );

  // Create the table instance
  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount,
    state: {
      sorting,
      pagination,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const state = typeof updater === "function" ? updater(sorting) : updater;

      const id = state.length > 0 ? state[0].id : null;
      const dir = state.length > 0 && state[0].desc ? "desc" : "asc";
      const value = id ? `${id}:${dir}` : null;

      const queryString = createQueryString({ sort: value });
      router.push(`${pathname}?${queryString}`, { scroll: false });
    },
    onPaginationChange: (updater) => {
      const state =
        typeof updater === "function" ? updater(pagination) : updater;

      const queryString = createQueryString({
        page: state.pageIndex + 1,
        per_page: state.pageSize,
      });

      router.push(`${pathname}?${queryString}`, { scroll: false });
    },
    onColumnFiltersChange: setColumnFilters,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableColumnResizing: false,
    getRowId: getRowId,
    initialState: {
      ...initialState,
      columnVisibility: initialState?.columnVisibility,
    },
  });

  // This handles the actual filtering - only apply with debounce and throttling
  const debouncedColumnFilters = useDebounce(columnFilters, debounceMs);
  const throttledColumnFilters = useThrottle(columnFilters, throttleMs);

  // Update URL with filters
  React.useEffect(() => {
    // Always update URL with filters, regardless of enableAdvancedFilter setting
    // Choose which state to use based on filter type
    const filtersToUse =
      debouncedColumnFilters.length > 0
        ? debouncedColumnFilters
        : throttledColumnFilters;

    if (filtersToUse.length === 0 && !filters) return;

    const nextFilters: Record<string, unknown> = {};

    // Build filter object
    for (const filter of filtersToUse) {
      // Special handling for date range filters (startedAt)
      if (filter.id === "startedAt" && Array.isArray(filter.value)) {
        const [fromTimestamp, toTimestamp] = filter.value;
        const dateRange: { from?: string; to?: string } = {};

        if (fromTimestamp) {
          dateRange.from = new Date(fromTimestamp).toISOString();
        }
        if (toTimestamp) {
          dateRange.to = new Date(toTimestamp).toISOString();
        }

        if (dateRange.from || dateRange.to) {
          nextFilters[filter.id] = dateRange;
        }
      } else if (typeof filter.value === "object" && filter.value !== null) {
        nextFilters[filter.id] = filter.value;
      } else if (Array.isArray(filter.value)) {
        nextFilters[filter.id] = filter.value;
      } else if (filter.value !== undefined) {
        nextFilters[filter.id] = filter.value;
      }
    }

    const queryString = createQueryString({
      filters:
        Object.keys(nextFilters).length > 0
          ? JSON.stringify(nextFilters)
          : null,
      page: 1, // Reset page when filters change
    });

    router.push(`${pathname}?${queryString}`, {
      scroll: false,
    });
  }, [
    debouncedColumnFilters,
    throttledColumnFilters,
    router,
    pathname,
    createQueryString,
    filters,
  ]);

  return {
    table,
    shallow,
    debounceMs,
    throttleMs,
  };
}
