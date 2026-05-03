"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import CompactDateInput from "@/components/CompactDateInput";
import LoadMoreTable from "@/components/LoadMoreTable";
import { formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { translate } from "@/lib/language";
import { LIVE_UPDATES_CHANNEL, TRANSACTIONS_UPDATED_EVENT, TRANSACTIONS_UPDATED_STORAGE_KEY } from "@/lib/live-updates";
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
  // Separate state for paid and customer transactions
  const [paidItems, setPaidItems] = useState<TransactionsFeedItem[]>(
    initialData.items.filter((t) => t.supplierId || t.type === "cost")
  );
  const [customerItems, setCustomerItems] = useState<TransactionsFeedItem[]>(
    initialData.items.filter((t) => t.customerId)
  );
  const [paidPage, setPaidPage] = useState(initialData.page);
  const [customerPage, setCustomerPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const DEFAULT_VISIBLE = 10;
  // Paginate paid transactions (show first `limit` rows, allow "Show more")
  const paidShowAll = false;
  const [paidHasMore, setPaidHasMore] = useState(initialData.hasMore);
  const [customerHasMore, setCustomerHasMore] = useState(initialData.hasMore);
  const [paidIsLoadingMore, setPaidIsLoadingMore] = useState(false);
  const [customerIsLoadingMore, setCustomerIsLoadingMore] = useState(false);
  const [printTarget, setPrintTarget] = useState<"paid" | "customer" | null>(null);
  const [paidFilterDate, setPaidFilterDate] = useState(defaultFilterDate);
  const [customerFilterDate, setCustomerFilterDate] = useState(defaultFilterDate);

  // Background: load all remaining pages so tables can show full history
  useEffect(() => {
    let cancelled = false;
    if (!initialData.hasMore) return;

    // Track loaded IDs to prevent duplicates
    const loadedPaidIds = new Set(paidItems.map((t) => `${t.__sourceCollection}_${t._id}`));
    const loadedCustomerIds = new Set(customerItems.map((t) => `${t.__sourceCollection}_${t._id}`));

    (async () => {
      try {
        let page = initialData.page + 1;
        while (!cancelled) {
          const resp = await fetch(`/api/transactions?page=${page}&limit=${limit}`, { cache: "no-store" });
          if (!resp.ok) break;
          const data = (await resp.json()) as TransactionsFeedPage;
          const morePaid = Array.isArray(data.items)
            ? data.items
                .filter((t) => t.supplierId || t.type === "cost")
                .filter((t) => {
                  const key = `${t.__sourceCollection}_${t._id}`;
                  if (loadedPaidIds.has(key)) return false;
                  loadedPaidIds.add(key);
                  return true;
                })
            : [];
          const moreCustomer = Array.isArray(data.items)
            ? data.items
                .filter((t) => t.customerId)
                .filter((t) => {
                  const key = `${t.__sourceCollection}_${t._id}`;
                  if (loadedCustomerIds.has(key)) return false;
                  loadedCustomerIds.add(key);
                  return true;
                })
            : [];
          if (morePaid.length || moreCustomer.length) {
            // Batch update both states together to reduce re-renders
            setPaidItems((cur) => (morePaid.length ? [...cur, ...morePaid] : cur));
            setCustomerItems((cur) => (moreCustomer.length ? [...cur, ...moreCustomer] : cur));
          }
          if (!data.hasMore) {
            setPaidHasMore(false);
            setCustomerHasMore(false);
            break;
          }
          page += 1;
          // Add small delay between requests to prevent overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialData.hasMore, initialData.page, limit]);

  // Refresh handlers for paid and customer transactions
  const refreshPaidTransactions = useCallback(async () => {
    try {
      const url = paidShowAll ? `/api/transactions?page=1&limit=100` : `/api/transactions?page=1&limit=${Math.max(limit, paidPage * limit)}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return;
      const latest = (await response.json()) as TransactionsFeedPage;
      const paidData = Array.isArray(latest.items) ? latest.items.filter((t) => t.supplierId || t.type === "cost") : [];
      setPaidItems(paidData);
      if (paidShowAll) {
        setPaidPage(1);
        setPaidHasMore(false);
      } else {
        const loadedWindow = Math.max(limit, paidPage * limit);
        setPaidPage(Math.max(1, Math.ceil(loadedWindow / limit)));
        setPaidHasMore(Boolean(latest.hasMore));
      }
    } catch {}
  }, [limit, paidPage]);

  const refreshCustomerTransactions = useCallback(async () => {
    const loadedWindow = Math.max(limit, customerPage * limit);
    try {
      const response = await fetch(`/api/transactions?page=1&limit=${loadedWindow}`, { cache: "no-store" });
      if (!response.ok) return;
      const latest = (await response.json()) as TransactionsFeedPage;
      const customerData = Array.isArray(latest.items) ? latest.items.filter((t) => t.customerId) : [];
      setCustomerItems(customerData);
      setCustomerPage(Math.max(1, Math.ceil(loadedWindow / limit)));
      setCustomerHasMore(Boolean(latest.hasMore));
    } catch {}
  }, [limit, customerPage]);


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

  // The effect for refreshing on focus, visibility, etc. should now use the new refreshPaidTransactions and refreshCustomerTransactions
  useEffect(() => {
    const handleWindowFocus = () => {
      void refreshPaidTransactions();
      void refreshCustomerTransactions();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshPaidTransactions();
        void refreshCustomerTransactions();
      }
    };
    const handleTransactionsUpdated = () => {
      void refreshPaidTransactions();
      void refreshCustomerTransactions();
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === TRANSACTIONS_UPDATED_STORAGE_KEY) {
        void refreshPaidTransactions();
        void refreshCustomerTransactions();
      }
    };
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      broadcastChannel = new BroadcastChannel(LIVE_UPDATES_CHANNEL);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === TRANSACTIONS_UPDATED_EVENT) {
          void refreshPaidTransactions();
          void refreshCustomerTransactions();
        }
      };
    }
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, handleTransactionsUpdated);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, handleTransactionsUpdated);
      window.removeEventListener("storage", handleStorageChange);
      broadcastChannel?.close();
    };
  }, [refreshPaidTransactions, refreshCustomerTransactions]);

  const getPaidTypeLabel = (type?: string) => {
    if (!type) return "-";
    if (type === "cost") return "cost";
    return type.replace(/^supplier-/, "");
  };

  const toSafeAmount = (value?: number) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Separate load more handlers
  const loadMorePaid = async () => {
    // When showing all paid transactions, do not load more
    if (paidShowAll) return;
    if (paidIsLoadingMore || !paidHasMore) return;
    setPaidIsLoadingMore(true);
    try {
      const response = await fetch(`/api/transactions?page=${paidPage + 1}&limit=${limit}`, { cache: "no-store" });
      if (!response.ok) return;
      const nextPage = (await response.json()) as TransactionsFeedPage;
      const newPaid = Array.isArray(nextPage.items) ? nextPage.items.filter((t) => t.supplierId || t.type === "cost") : [];
      setPaidItems((current) => [...current, ...newPaid]);
      setPaidPage(nextPage.page ?? paidPage + 1);
      setPaidHasMore(Boolean(nextPage.hasMore));
    } finally {
      setPaidIsLoadingMore(false);
    }
  };

  const loadMoreCustomer = async () => {
    if (customerIsLoadingMore || !customerHasMore) return;
    setCustomerIsLoadingMore(true);
    try {
      const response = await fetch(`/api/transactions?page=${customerPage + 1}&limit=${limit}`, { cache: "no-store" });
      if (!response.ok) return;
      const nextPage = (await response.json()) as TransactionsFeedPage;
      const newCustomer = Array.isArray(nextPage.items) ? nextPage.items.filter((t) => t.customerId) : [];
      setCustomerItems((current) => [...current, ...newCustomer]);
      setCustomerPage(nextPage.page ?? customerPage + 1);
      setCustomerHasMore(Boolean(nextPage.hasMore));
    } finally {
      setCustomerIsLoadingMore(false);
    }
  };

  const handleTablePrint = (target: "paid" | "customer") => {
    flushSync(() => {
      setPrintTarget(target);
    });
    window.print();
  };

  // Memoize date key calculation to avoid recomputing for every filter operation
  const filterDateKey = useMemo(() => paidFilterDate, [paidFilterDate]);
  const customerFilterDateKey = useMemo(() => customerFilterDate, [customerFilterDate]);

  const paidTransactions = useMemo(() => {
    if (!filterDateKey) return paidItems;
    return paidItems.filter((item) => getDateKey(item.date) === filterDateKey);
  }, [paidItems, filterDateKey]);

  const customerTransactions = useMemo(() => {
    if (!customerFilterDateKey) return customerItems;
    return customerItems.filter((item) => getDateKey(item.date) === customerFilterDateKey);
  }, [customerItems, customerFilterDateKey]);
  const deferredPaidTransactions = useDeferredValue(paidTransactions);
  const deferredCustomerTransactions = useDeferredValue(customerTransactions);

  // Memoize the split logic to avoid recalculating
  const paidCount = useMemo(() => paidTransactions.length, [paidTransactions]);
  const customerCount = useMemo(() => customerTransactions.length, [customerTransactions]);

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
        <tr key={`paid_${t.__sourceCollection}_${t._id}_${index}`} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
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
        <tr key={`customer_${t.__sourceCollection}_${t._id}_${index}`} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
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
                {formatLocalizedNumber(paidCount, language, { maximumFractionDigits: 0 })} {translate(language, "entries")}
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
                initialCount={DEFAULT_VISIBLE}
                loadMoreLabel="Show more"
                hasMoreOverride={paidShowAll ? false : (paidHasMore ? true : undefined)}
                isLoadingMore={paidIsLoadingMore}
                onLoadMore={loadMorePaid}
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
                {formatLocalizedNumber(customerCount, language, { maximumFractionDigits: 0 })} {translate(language, "entries")}
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
                initialCount={DEFAULT_VISIBLE}
                loadMoreLabel="Show more"
                hasMoreOverride={customerHasMore ? true : undefined}
                isLoadingMore={customerIsLoadingMore}
                onLoadMore={loadMoreCustomer}
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
