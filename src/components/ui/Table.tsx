import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * `Table` — the shared data-table primitive for list-heavy screens
 * (appointments, doctors, upload-report history, etc).
 *
 * Usage:
 * ```tsx
 * <Table
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'status', header: 'Status', render: (row) => <Badge tone="success">{row.status}</Badge> },
 *   ]}
 *   data={rows}
 *   rowKey={(row) => row.id}
 *   onRowClick={(row) => navigate(`/home/appointments/${row.id}`)}
 *   isLoading={isLoading}
 *   emptyState={<p>No appointments yet.</p>}
 * />
 * ```
 * - `columns[].key` reads straight off the row when no `render` is given.
 * - `columns[].sortable` turns the header into a click-to-sort control; sorting
 *   compares the same value `key` reads (or falls back to string compare on
 *   the rendered content order) — for a computed/complex column, provide
 *   `sortValue(row)` to control what's compared.
 * - Sorting is client-side over the given `data`. For server-side sorting,
 *   omit `sortable` and drive order via `data` yourself, or use `onSortChange`.
 */
export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  /** Extra classes for both the `<th>` and each `<td>` in this column, e.g. `'text-right'`. */
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  /** Shown in place of rows when `data` is empty and not loading. */
  emptyState?: ReactNode;
  /** Shown in place of rows while `isLoading` is true. Defaults to a spinner row. */
  loadingState?: ReactNode;
  /** Called with the new sort state whenever a sortable header is clicked (in addition to the built-in client-side sort). */
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' } | null) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc';

const ALIGN_CLASSES: Record<NonNullable<TableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  isLoading = false,
  emptyState,
  loadingState,
  onSortChange,
  className,
}: TableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);

  function toggleSort(column: TableColumn<T>) {
    if (!column.sortable) return;
    const next: { key: string; direction: SortDirection } | null =
      sort?.key === column.key
        ? sort.direction === 'asc'
          ? { key: column.key, direction: 'desc' }
          : null
        : { key: column.key, direction: 'asc' };
    setSort(next);
    onSortChange?.(next);
  }

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return data;
    const valueOf = column.sortValue ?? ((row: T) => (row as Record<string, unknown>)[column.key] as string | number);
    const copy = [...data];
    copy.sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    if (sort.direction === 'desc') copy.reverse();
    return copy;
  }, [data, sort, columns]);

  return (
    <div className={`overflow-x-auto rounded-lg border border-divider bg-surface ${className ?? ''}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-divider bg-surface-variant/60">
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={`whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary ${
                  ALIGN_CLASSES[column.align ?? 'left']
                }`}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-accent-dark"
                  >
                    {column.header}
                    <SortIndicator active={sort?.key === column.key} direction={sort?.direction} />
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            loadingState ? (
              <tr>
                <td colSpan={columns.length} className="px-3.5 py-8 text-center text-text-tertiary">
                  {loadingState}
                </td>
              </tr>
            ) : (
              <DefaultLoadingRows columnCount={columns.length} />
            )
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3.5 py-8 text-center text-text-tertiary">
                {emptyState ?? 'No data.'}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                className={`animate-row-in border-b border-divider transition-colors duration-150 last:border-b-0 ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-gradient-to-r hover:from-accent-pale/50 hover:to-transparent'
                    : 'hover:bg-gradient-to-r hover:from-accent-pale/30 hover:to-transparent'
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3.5 py-2.5 text-text-primary ${ALIGN_CLASSES[column.align ?? 'left']}`}
                  >
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortIndicator({ active, direction }: { active?: boolean; direction?: SortDirection }) {
  return (
    <span
      className={`inline-block text-[10px] leading-none transition-all duration-200 ease-out ${
        active ? 'text-accent-dark' : 'text-text-tertiary/60'
      }`}
      style={{ transform: active && direction === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      ▲
    </span>
  );
}

/** Shimmering placeholder rows shown while `isLoading` and no custom `loadingState` is given. */
function DefaultLoadingRows({ columnCount }: { columnCount: number }) {
  const rows = [0, 1, 2, 3, 4];
  return (
    <>
      {rows.map((row) => (
        <tr key={row} className="border-b border-divider last:border-b-0">
          {Array.from({ length: columnCount }).map((_, col) => (
            <td key={col} className="px-3.5 py-3">
              <div className="skeleton-shimmer h-3.5 w-[70%] rounded" style={{ animationDelay: `${(row + col) * 40}ms` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
