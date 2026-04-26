"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import CompactDateInput from "@/components/CompactDateInput";
import LoadMoreTable from "@/components/LoadMoreTable";
import { formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { translate } from "@/lib/language";
import type { TransactionsFeedItem, TransactionsFeedPage } from "@/lib/transactions-data";
import { useLanguage } from "@/lib/useLanguage";

type TransactionsClientProps = {
  initialData: TransactionsFeedPage;
};

const todayIso = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateKey = (value?: string | Date) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

export default function TransactionsClient({ initialData }: TransactionsClientProps) {
  const { language } = useLanguage();
  const originalTitleRef = useRef("");
  const defaultFilterDate = "";
  const [items, setItems] = useState<TransactionsFeedItem[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [printTarget, setPrintTarget] = useState<"paid" | "customer" | null>(null);
  const [paidFilterDate, setPaidFilterDate] = useState(defaultFilterDate);
  const [customerFilterDate, setCustomerFilterDate] = useState(defaultFilterDate);
  const data = items;

  useEffect(() => {
    const handleBeforePrint = () => {
      originalTitleRef.current = document.title;
      document.title = "";
    };

    const handleAfterPrint = () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
      setPrintTarget(null);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  const getPaidTypeLabel = (type?: string) => {
    if (!type) return "-";
    if (type === "cost") return "cost";
    return type.replace(/^supplier-/, "");
  };

  const toSafeAmount = (value?: number) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const loadNextPage = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const response = await fetch(`/api/transactions?page=${page + 1}&limit=${limit}`, { cache: "no-store" });
      if (!response.ok) return;

      const nextPage = (await response.json()) as TransactionsFeedPage;
      setItems((current) => [...current, ...(Array.isArray(nextPage.items) ? nextPage.items : [])]);
      setPage(nextPage.page ?? page + 1);
      setHasMore(Boolean(nextPage.hasMore));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleTablePrint = (target: "paid" | "customer") => {
    flushSync(() => {
      setPrintTarget(target);
    });
    window.print();
  };

  const paidTransactions = useMemo(() => {
    const paidData = data.filter((t) => t.supplierId || t.type === "cost");
    return paidFilterDate ? paidData.filter((item) => getDateKey(item.date) === paidFilterDate) : paidData;
  }, [data, paidFilterDate]);

  const customerTransactions = useMemo(() => {
    const customerData = data.filter((t) => t.customerId);
    return customerFilterDate
      ? customerData.filter((item) => getDateKey(item.date) === customerFilterDate)
      : customerData;
  }, [data, customerFilterDate]);
  const deferredPaidTransactions = useDeferredValue(paidTransactions);
  const deferredCustomerTransactions = useDeferredValue(customerTransactions);

  const paidTotalAmount = useMemo(
    () => deferredPaidTransactions.reduce((sum, transaction) => sum + toSafeAmount(transaction.amount), 0),
    [deferredPaidTransactions]
  );
  const customerTotalAmount = useMemo(
    () => deferredCustomerTransactions.reduce((sum, transaction) => sum + toSafeAmount(transaction.amount), 0),
    [deferredCustomerTransactions]
  );

  const paidTransactionRows = useMemo(
    () =>
      deferredPaidTransactions.map((t, index) => (
        <tr key={t._id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
          <td className="px-4 py-4 text-sm text-slate-800">{formatLocalizedDate(t.date, language)}</td>
          <td className="px-4 py-4 text-sm text-slate-800">{t.supplierName || t.personName || "-"}</td>
          <td className="px-4 py-4 text-sm text-slate-600">{getPaidTypeLabel(t.type)}</td>
          <td className="px-4 py-4 text-sm text-slate-600">
            Tk {formatLocalizedNumber(Number(t.amount ?? 0), language, { maximumFractionDigits: 0 })}
          </td>
          <td className="px-4 py-4">
            {t.supplierId ? (
              <Link
                href={`/invoices/suppliers/${t.supplierId}`}
                target="_blank"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Print
              </Link>
            ) : (
              <span className="text-sm text-slate-400">-</span>
            )}
          </td>
        </tr>
      )),
    [deferredPaidTransactions, language]
  );

  const customerTransactionRows = useMemo(
    () =>
      deferredCustomerTransactions.map((t, index) => (
        <tr key={t._id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
          <td className="px-4 py-4 text-sm text-slate-800">{formatLocalizedDate(t.date, language)}</td>
          <td className="px-4 py-4 text-sm text-slate-800">{t.customerName || "-"}</td>
          <td className="px-4 py-4 text-sm text-slate-600">{t.type}</td>
          <td className="px-4 py-4 text-sm text-slate-600">
            Tk {formatLocalizedNumber(Number(t.amount ?? 0), language, { maximumFractionDigits: 0 })}
          </td>
          <td className="px-4 py-4">
            <Link
              href={`/invoices/customers/${t.customerId}`}
              target="_blank"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              Print
            </Link>
          </td>
        </tr>
      )),
    [deferredCustomerTransactions, language]
  );

  return (
    <div className="space-y-4">
      <div className="print-hidden p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{translate(language, "transactions")}</h1>
            <p className="mt-2 text-slate-500">{translate(language, "transactionsPageDescription")}</p>
          </div>

        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className={`overflow-x-auto rounded-lg bg-white p-4 shadow-sm ${printTarget === "customer" ? "print-target-hidden" : ""}`}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{translate(language, "paidTransactions")}</h2>
              <span className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                {formatLocalizedNumber(paidTransactions.length, language, { maximumFractionDigits: 0 })} {translate(language, "entries")}
              </span>
            </div>
            <div className="print-hidden flex flex-wrap items-end gap-2">
              <div className="min-w-[13rem]">
                <CompactDateInput
                  name="paidTransactionsFilterDate"
                  label={translate(language, "dateLabel")}
                  value={paidFilterDate}
                  onChange={setPaidFilterDate}
                  max={todayIso()}
                  inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
              {paidFilterDate !== defaultFilterDate ? (
                <button
                  type="button"
                  onClick={() => setPaidFilterDate(defaultFilterDate)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {translate(language, "cancel")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleTablePrint("paid")}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
              >
                {translate(language, "print")}
              </button>
            </div>
          </div>
          <table className="min-w-[50rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-sm text-slate-500">
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
                rows={paidTransactionRows}
                colSpan={5}
                loadMoreLabel="Show more"
                hasMoreOverride={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadNextPage}
                emptyState={
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      {translate(language, "noPaidTransactions")}
                    </td>
                  </tr>
                }
              />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                <td colSpan={3} className="px-4 py-3">
                  {translate(language, "totals")}
                </td>
                <td className="px-4 py-3">
                  Tk {formatLocalizedNumber(paidTotalAmount, language, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className={`overflow-x-auto rounded-lg bg-white p-4 shadow-sm ${printTarget === "paid" ? "print-target-hidden" : ""}`}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{translate(language, "customerTransactions")}</h2>
              <span className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                {formatLocalizedNumber(customerTransactions.length, language, { maximumFractionDigits: 0 })} {translate(language, "entries")}
              </span>
            </div>
            <div className="print-hidden flex flex-wrap items-end gap-2">
              <div className="min-w-[13rem]">
                <CompactDateInput
                  name="customerTransactionsFilterDate"
                  label={translate(language, "dateLabel")}
                  value={customerFilterDate}
                  onChange={setCustomerFilterDate}
                  max={todayIso()}
                  inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
              {customerFilterDate !== defaultFilterDate ? (
                <button
                  type="button"
                  onClick={() => setCustomerFilterDate(defaultFilterDate)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {translate(language, "cancel")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleTablePrint("customer")}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
              >
                {translate(language, "print")}
              </button>
            </div>
          </div>
          <table className="min-w-[50rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-sm text-slate-500">
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
                rows={customerTransactionRows}
                colSpan={5}
                loadMoreLabel="Show more"
                hasMoreOverride={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadNextPage}
                emptyState={
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      {translate(language, "noCustomerTransactions")}
                    </td>
                  </tr>
                }
              />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                <td colSpan={3} className="px-4 py-3">
                  {translate(language, "totals")}
                </td>
                <td className="px-4 py-3">
                  Tk {formatLocalizedNumber(customerTotalAmount, language, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
