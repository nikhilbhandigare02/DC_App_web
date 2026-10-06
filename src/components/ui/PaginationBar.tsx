import { Button } from './Button';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageSelected: (page: number) => void;
  /** When given, a "Showing a–b of N" line is shown (even when everything fits on one page). */
  totalItems?: number;
  pageSize?: number;
}

/** Prev/page-number/Next controls, ported from `_PaginationBar` (upload_report_screen.dart), restyled compact. */
export function PaginationBar({ currentPage, totalPages, onPageSelected, totalItems, pageSize = 10 }: PaginationBarProps) {
  const edgeCount = 1;
  const pages: (number | null)[] = [];
  let last: number | null = null;
  for (let page = 1; page <= totalPages; page++) {
    const isEdge = page <= edgeCount || page > totalPages - edgeCount;
    const isNearCurrent = Math.abs(page - currentPage) <= 1;
    if (isEdge || isNearCurrent) {
      if (last !== null && page - last > 1) pages.push(null);
      pages.push(page);
      last = page;
    }
  }

  const summary =
    totalItems != null && totalItems > 0 ? (
      <p className="text-center text-xs text-text-tertiary">
        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </p>
    ) : null;

  // Server-paged lists (no total given) hide the bar until there is a second page;
  // client-paged lists always show it so paging is visible on every list screen.
  if (totalPages <= 1 && totalItems == null) return summary;

  return (
    <div className="flex flex-col items-center gap-2">
      {summary}
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="secondary"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageSelected(currentPage - 1)}
        aria-label="Previous page"
        className="!px-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Button>
      {pages.map((page, idx) =>
        page === null ? (
          <span key={`gap-${idx}`} className="px-1 text-xs text-text-tertiary">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            disabled={page === currentPage}
            onClick={() => onPageSelected(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-[12.5px] font-medium transition-all duration-150 ${
              page === currentPage
                ? 'bg-gradient-to-b from-primary-light to-primary text-white shadow-[0_2px_6px_-1px_rgba(18,60,94,0.5)]'
                : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary'
            }`}
          >
            {page}
          </button>
        ),
      )}
      <Button
        variant="secondary"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageSelected(currentPage + 1)}
        aria-label="Next page"
        className="!px-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Button>
    </div>
    </div>
  );
}
