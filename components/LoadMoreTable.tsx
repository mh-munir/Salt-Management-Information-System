"use client";

import { ReactNode, useMemo, useState } from "react";

type Props = {
  rows: ReactNode[];
  initialCount?: number;
  colSpan: number;
  loadMoreLabel?: string;
  emptyState: ReactNode;
  hasMoreOverride?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
};

export default function LoadMoreTable({
  rows,
  initialCount = 10,
  colSpan,
  loadMoreLabel = "Show more",
  emptyState,
  hasMoreOverride,
  isLoadingMore = false,
  onLoadMore,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const hasMore = hasMoreOverride ?? rows.length > visibleCount;

  return (
    <>
      {rows.length === 0 ? (
        emptyState
      ) : (
        <>{visibleRows}</>
      )}
      {hasMore ? (
        <tr>
          <td colSpan={colSpan} className="px-4 py-4 text-center">
            <button
              type="button"
              onClick={() => {
                if (onLoadMore) {
                  void onLoadMore();
                  return;
                }

                setVisibleCount((current) => Math.min(rows.length, current + initialCount));
              }}
              disabled={isLoadingMore}
              className="inline-flex items-center justify-center rounded-lg border border-sky-500 bg-[#348CD4] px-6 py-3 text-sm lg:text-md font-semibold text-white shadow-sm transition hover:bg-[#2F7FC0] focus:outline-none"
            >
              {isLoadingMore ? "Loading..." : loadMoreLabel}
            </button>
          </td>
        </tr>
      ) : null}
    </>
  );
}
