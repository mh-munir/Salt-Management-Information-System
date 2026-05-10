"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import TransactionsTableSection from "@/app/(dashboard)/transactions/TransactionsTableSection";
import { formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { translate } from "@/lib/language";
import { LIVE_UPDATES_CHANNEL, TRANSACTIONS_UPDATED_EVENT, TRANSACTIONS_UPDATED_STORAGE_KEY } from "@/lib/live-updates";
import type { TransactionsFeedItem, TransactionsFeedPage } from "@/lib/transactions-data";
import { useLanguage } from "@/lib/useLanguage";

type TransactionsClientProps = {
  initialData: TransactionsFeedPage;
};

const todayIso = () => new Date().toISOString().split("T")[0];

const isPaidTransaction = (t: TransactionsFeedItem): boolean => !!(t.supplierId || t.type === "cost");
const isCustomerTransaction = (t: TransactionsFeedItem): boolean => !!t.customerId;

const getDateKey = (value?: string | Date) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

export default function TransactionsClient({ initialData }: TransactionsClientProps) {
  const { language } = useLanguage();
  const [paidItems, setPaidItems] = useState<TransactionsFeedItem[]>(
    initialData.items.filter(isPaidTransaction)
  );
  const [customerItems, setCustomerItems] = useState<TransactionsFeedItem[]>(
    initialData.items.filter(isCustomerTransaction)
  );
  const [paidHasMore, setPaidHasMore] = useState(initialData.hasMore);
  const [customerHasMore, setCustomerHasMore] = useState(initialData.hasMore);
  const [paidIsLoadingMore, setPaidIsLoadingMore] = useState(false);
  const [customerIsLoadingMore, setCustomerIsLoadingMore] = useState(false);
  const [paidNextPage, setPaidNextPage] = useState(initialData.page + 1);
  const [customerNextPage, setCustomerNextPage] = useState(initialData.page + 1);
  const [printTarget, setPrintTarget] = useState<"paid" | "customer" | null>(null);
  const [paidFilterDate, setPaidFilterDate] = useState("");
  const [customerFilterDate, setCustomerFilterDate] = useState("");

  // Generic refresh handler
  const refreshTransactions = useCallback(async (type: "paid" | "customer") => {
    try {
      const response = await fetch(`/api/transactions?page=1&limit=50`, { cache: "no-store" });
      if (!response.ok) return;
      const latest = (await response.json()) as TransactionsFeedPage;
      const predicate = type === "paid" ? isPaidTransaction : isCustomerTransaction;
      const data = latest.items.filter(predicate);
      if (type === "paid") {
        setPaidItems(data);
        setPaidHasMore(latest.hasMore);
        setPaidNextPage(2);
      } else {
        setCustomerItems(data);
        setCustomerHasMore(latest.hasMore);
        setCustomerNextPage(2);
      }
    } catch {}
  }, []);

  const refreshPaidTransactions = useCallback(() => refreshTransactions("paid"), [refreshTransactions]);
  const refreshCustomerTransactions = useCallback(() => refreshTransactions("customer"), [refreshTransactions]);


  useEffect(() => {
    const handleBeforePrint = () => {
      document.title = "";
    };

    const handleAfterPrint = () => {
      setPrintTarget(null);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // Centralized refresh trigger
  useEffect(() => {
    const refreshAll = () => {
      void refreshPaidTransactions();
      void refreshCustomerTransactions();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshAll();
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === TRANSACTIONS_UPDATED_STORAGE_KEY) refreshAll();
    };

    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      broadcastChannel = new BroadcastChannel(LIVE_UPDATES_CHANNEL);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === TRANSACTIONS_UPDATED_EVENT) refreshAll();
      };
    }

    window.addEventListener("focus", refreshAll);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, refreshAll);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("focus", refreshAll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, refreshAll);
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

  // Generic load more handler
  const createLoadMore = (
    isLoading: boolean,
    hasMore: boolean,
    nextPage: number,
    setIsLoading: (v: boolean) => void,
    setItems: (fn: (c: TransactionsFeedItem[]) => TransactionsFeedItem[]) => void,
    setHasMore: (v: boolean) => void,
    setNextPage: (v: number) => void,
    predicate: (t: TransactionsFeedItem) => boolean
  ) =>
    async () => {
      if (isLoading || !hasMore) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/transactions?page=${nextPage}&limit=${initialData.limit}`, { cache: "no-store" });
        if (!response.ok) return;
        const nextPageData = (await response.json()) as TransactionsFeedPage;
        const nextItems = nextPageData.items.filter(predicate);
        setItems((current) => [...current, ...nextItems]);
        setHasMore(nextPageData.hasMore);
        setNextPage(nextPageData.page + 1);
      } finally {
        setIsLoading(false);
      }
    };

  const loadMorePaid = createLoadMore(
    paidIsLoadingMore,
    paidHasMore,
    paidNextPage,
    setPaidIsLoadingMore,
    setPaidItems,
    setPaidHasMore,
    setPaidNextPage,
    isPaidTransaction
  );
  const loadMoreCustomer = createLoadMore(
    customerIsLoadingMore,
    customerHasMore,
    customerNextPage,
    setCustomerIsLoadingMore,
    setCustomerItems,
    setCustomerHasMore,
    setCustomerNextPage,
    isCustomerTransaction
  );

  const handleTablePrint = (target: "paid" | "customer") => {
    flushSync(() => {
      setPrintTarget(target);
    });
    window.print();
  };

  // Memoize date key calculation to avoid recomputing for every filter operation
  const paidTransactions = useMemo(() => {
    if (!paidFilterDate) return paidItems;
    return paidItems.filter((item) => getDateKey(item.date) === paidFilterDate);
  }, [paidItems, paidFilterDate]);

  const customerTransactions = useMemo(() => {
    if (!customerFilterDate) return customerItems;
    return customerItems.filter((item) => getDateKey(item.date) === customerFilterDate);
  }, [customerItems, customerFilterDate]);
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
        <TransactionsTableSection
          title={translate(language, "paidTransactions")}
          entriesLabel={translate(language, "entries")}
          entryCountLabel={formatLocalizedNumber(paidTransactions.length, language, { maximumFractionDigits: 0 })}
          filterDate={paidFilterDate}
          onFilterDateChange={setPaidFilterDate}
          onClearFilter={() => setPaidFilterDate("")}
          onPrint={() => handleTablePrint("paid")}
          printLabel={translate(language, "print")}
          cancelLabel={translate(language, "cancel")}
          dateLabel={translate(language, "dateLabel")}
          maxDate={todayIso()}
          rows={paidTransactionRows}
          colSpan={5}
          hasMore={paidHasMore}
          isLoadingMore={paidIsLoadingMore}
          onLoadMore={loadMorePaid}
          hiddenOnPrint={printTarget === "customer"}
          emptyState={
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                {translate(language, "noPaidTransactions")}
              </td>
            </tr>
          }
          totalRow={
            <tr className="app-table-total font-semibold text-slate-800">
              <td colSpan={3} className="px-4 py-3">
                {translate(language, "totals")}
              </td>
              <td className="px-4 py-3">Tk {formatLocalizedNumber(paidTotalAmount, language, { maximumFractionDigits: 0 })}</td>
              <td className="px-4 py-3">-</td>
            </tr>
          }
        />

        <TransactionsTableSection
          title={translate(language, "customerTransactions")}
          entriesLabel={translate(language, "entries")}
          entryCountLabel={formatLocalizedNumber(customerTransactions.length, language, { maximumFractionDigits: 0 })}
          filterDate={customerFilterDate}
          onFilterDateChange={setCustomerFilterDate}
          onClearFilter={() => setCustomerFilterDate("")}
          onPrint={() => handleTablePrint("customer")}
          printLabel={translate(language, "print")}
          cancelLabel={translate(language, "cancel")}
          dateLabel={translate(language, "dateLabel")}
          maxDate={todayIso()}
          rows={customerTransactionRows}
          colSpan={5}
          hasMore={customerHasMore}
          isLoadingMore={customerIsLoadingMore}
          onLoadMore={loadMoreCustomer}
          hiddenOnPrint={printTarget === "paid"}
          emptyState={
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                {translate(language, "noCustomerTransactions")}
              </td>
            </tr>
          }
          totalRow={
            <tr className="app-table-total font-semibold text-slate-800">
              <td colSpan={3} className="px-4 py-3">
                {translate(language, "totals")}
              </td>
              <td className="px-4 py-3">Tk {formatLocalizedNumber(customerTotalAmount, language, { maximumFractionDigits: 0 })}</td>
              <td className="px-4 py-3">-</td>
            </tr>
          }
        />
      </div>
    </div>
  );
}
