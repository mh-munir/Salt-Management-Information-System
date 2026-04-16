"use client";

import { ReactNode, useMemo, useState } from "react";

type Props<T> = {
  items: T[];
  initialCount?: number;
  colSpan: number;
  loadMoreLabel?: string;
  emptyState: ReactNode;
  renderRows: (items: T[]) => ReactNode;
};

export default function LoadMoreTable<T>({
  items,
  initialCount = 10,
  colSpan,
  loadMoreLabel = "Show more",
  emptyState,
  renderRows,
}: Props<T>) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = items.length > visibleCount;

  return (
    <>
      {items.length === 0 ? (
        emptyState
      ) : (
        <>{renderRows(visibleItems)}</>
      )}
      {hasMore ? (
        <tr>
          <td colSpan={colSpan} className="px-4 py-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((current) => Math.min(items.length, current + initialCount))}
              className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {loadMoreLabel}
            </button>
          </td>
        </tr>
      ) : null}
    </>
  );
}
