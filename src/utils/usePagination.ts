import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE = 10;

/**
 * Client-side pagination of an already-loaded (and already-filtered) list.
 * Falls back to the last page when the list shrinks below the current one
 * (e.g. after a search narrows it), so the user never lands on an empty page.
 */
export function usePagination<T>(items: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );

  return { currentPage, totalPages, pageItems, setPage, pageSize, totalItems: items.length };
}
