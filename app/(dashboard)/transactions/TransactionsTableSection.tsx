"use client";

import type { ReactNode } from "react";
import CompactDateInput from "@/components/CompactDateInput";
import LoadMoreTable from "@/components/LoadMoreTable";

type Props = {
  title: string;
  entriesLabel: string;
  entryCountLabel: string;
  filterDate: string;
  onFilterDateChange: (value: string) => void;
  onClearFilter: () => void;
  onPrint: () => void;
  printLabel: string;
  cancelLabel: string;
  dateLabel: string;
  maxDate: string;
  rows: ReactNode[];
  colSpan: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void | Promise<void>;
  emptyState: ReactNode;
  totalRow: ReactNode;
  hiddenOnPrint: boolean;
};

export default function TransactionsTableSection({
  title,
  entriesLabel,
  entryCountLabel,
  filterDate,
  onFilterDateChange,
  onClearFilter,
  onPrint,
  printLabel,
  cancelLabel,
  dateLabel,
  maxDate,
  rows,
  colSpan,
  hasMore,
  isLoadingMore,
  onLoadMore,
  emptyState,
  totalRow,
  hiddenOnPrint,
}: Props) {
  return (
    <div className={`app-table-shell p-4 ${hiddenOnPrint ? "print-target-hidden" : ""}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <span className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            {entryCountLabel} {entriesLabel}
          </span>
        </div>
        <div className="print-hidden flex flex-wrap items-end gap-2">
          <div className="min-w-[13rem]">
            <CompactDateInput
              name={`${title}-filter-date`}
              label={dateLabel}
              value={filterDate}
              onChange={onFilterDateChange}
              max={maxDate}
              inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </div>
          {filterDate ? (
            <button
              type="button"
              onClick={onClearFilter}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
          >
            {printLabel}
          </button>
        </div>
      </div>
      <div className="app-table-scroll">
        <table className="app-table min-w-[50rem] text-left text-sm">
          <thead className="text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Print</th>
            </tr>
          </thead>
          <tbody>
            <LoadMoreTable
              rows={rows}
              colSpan={colSpan}
              initialCount={10}
              loadMoreLabel="Show more"
              hasMoreOverride={hasMore ? true : undefined}
              isLoadingMore={isLoadingMore}
              onLoadMore={onLoadMore}
              emptyState={emptyState}
            />
          </tbody>
          <tfoot>{totalRow}</tfoot>
        </table>
      </div>
    </div>
  );
}
