"use client";

import { type FormEvent, type ReactNode, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import CompactDateInput from "@/components/CompactDateInput";
import Card from "@/components/Card";
import FloatingInput from "@/components/FloatingInput";
import LoadMoreTable from "@/components/LoadMoreTable";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { translate } from "@/lib/language";
import { emitTransactionsUpdated } from "@/lib/live-updates";
import { useLanguage } from "@/lib/useLanguage";

type CostEntry = {
  _id: string;
  personName: string;
  amount: number;
  purpose: string;
  date?: string | Date;
  createdAt?: string | Date;
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

const parseJson = async (res: Response) => {
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

function DashboardPanel({
  tone = "sky",
  children,
  className = "",
}: {
  tone?: "sky" | "emerald" | "amber" | "violet" | "rose";
  children: ReactNode;
  className?: string;
}) {
  const accents = {
    sky: "from-sky-500/18 via-sky-500/8 to-transparent",
    emerald: "from-emerald-500/18 via-emerald-500/8 to-transparent",
    amber: "from-amber-500/18 via-amber-500/8 to-transparent",
    violet: "from-violet-500/18 via-violet-500/8 to-transparent",
    rose: "from-rose-500/18 via-rose-500/8 to-transparent",
  } as const;

  return (
    <div
      className={`dashboard-card-shell group relative overflow-hidden rounded-lg border border-gray-200 bg-white/95 p-6 shadow-sm transition duration-300 dark:border-slate-700 dark:bg-[#1F2128] ${className}`.trim()}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20`}
      />
      <div className="pointer-events-none absolute inset-0" />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function CostPage() {
  const { language } = useLanguage();
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [historyFilterDate, setHistoryFilterDate] = useState("");
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState(todayIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const refreshCosts = useCallback(
    () =>
      fetch("/api/costs", { cache: "no-store" })
        .then(parseJson)
        .then((data) => {
          startTransition(() => {
            const sortedData = Array.isArray(data) 
              ? [...data].sort((a, b) => {
                  const dateA = new Date(a.date || a.createdAt || 0).getTime();
                  const dateB = new Date(b.date || b.createdAt || 0).getTime();
                  return dateB - dateA; // Most recent first
                })
              : [];
            setCosts(sortedData);
          });
        }),
    []
  );

  useEffect(() => {
    void refreshCosts();
  }, [refreshCosts]);

  const todayKey = todayIso();
  const totalCost = useMemo(() => costs.reduce((sum, item) => sum + Number(item.amount ?? 0), 0), [costs]);
  const todayCost = useMemo(
    () =>
      costs.reduce((sum, item) => {
        return getDateKey(item.date) === todayKey ? sum + Number(item.amount ?? 0) : sum;
      }, 0),
    [costs, todayKey]
  );
  const todayEntryCount = useMemo(
    () => costs.reduce((sum, item) => (getDateKey(item.date) === todayKey ? sum + 1 : sum), 0),
    [costs, todayKey]
  );
  const averageCost = costs.length > 0 ? totalCost / costs.length : 0;
  const highestCost = costs.reduce((max, item) => Math.max(max, Number(item.amount ?? 0)), 0);
  const latestCost = costs[0];
  const filteredCosts = useMemo(
    () => (historyFilterDate ? costs.filter((item) => getDateKey(item.date) === historyFilterDate) : costs),
    [costs, historyFilterDate]
  );
  const deferredFilteredCosts = useDeferredValue(filteredCosts);
  const filteredCostTotal = useMemo(
    () => deferredFilteredCosts.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [deferredFilteredCosts]
  );
  const recentCostPoints = useMemo(() => {
    const points = costs
      .slice(0, 8)
      .reverse()
      .map((item) => Number(item.amount ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (points.length >= 2) return points;
    if (points.length === 1) return [0, points[0]];
    return [0, 0];
  }, [costs]);

  const formatCurrency = useCallback(
    (value: number) => `Tk ${formatLocalizedNumber(value, language, { maximumFractionDigits: 2 })}`,
    [language]
  );
  const todayCostSharePercent = totalCost > 0 ? (todayCost / totalCost) * 100 : 0;
  const averageVsHighestPercent = highestCost > 0 ? (averageCost / highestCost) * 100 : 0;
  const highestCostSharePercent = totalCost > 0 ? (highestCost / totalCost) * 100 : 0;
  const printCostListLabel = "Print Cost List";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedPersonName = personName.trim();
    const trimmedPurpose = purpose.trim();
    const amountValue = Number(amount);

    if (!trimmedPersonName) {
      setError(translate(language, "personNameRequired"));
      return;
    }

    if (!trimmedPurpose) {
      setError(translate(language, "purposeRequired"));
      return;
    }

    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      setError(translate(language, "enterValidAmount"));
      return;
    }

    if (!date) {
      setError(translate(language, "pleaseSelectPaymentDate"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personName: trimmedPersonName,
          amount: amountValue,
          purpose: trimmedPurpose,
          date,
        }),
      });

      const responseBody = await response.text();
      const data = responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        setError(data?.message ?? translate(language, "unableToSaveCost"));
        return;
      }

      await refreshCosts();
      setPersonName("");
      setAmount("");
      setPurpose("");
      setDate(todayIso());
      setSuccessMessage(translate(language, "costSavedSuccessfully"));
      emitTransactionsUpdated();

      localStorage.setItem("costUpdated", Date.now().toString());

      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("dashboard-updates");
        channel.postMessage({ type: "costAdded", timestamp: Date.now() });
        channel.close();
      }

      window.dispatchEvent(new CustomEvent("costAdded"));
    } catch {
      setError(translate(language, "unableToSaveCost"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const costRows = useMemo(
    () =>
      deferredFilteredCosts.map((cost, index) => (
        <tr
          key={cost._id}
          className={`border-b border-slate-200/80 dark:border-slate-800 ${index % 2 === 0 ? "bg-white/90 dark:bg-slate-950/50" : "bg-slate-50/70 dark:bg-slate-900/60"}`}
        >
          <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{formatLocalizedDate(cost.date, language)}</td>
          <td className="px-4 py-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                {formatDisplayName(cost.personName, translate(language, "unknownPerson"))}
              </p>
            </div>
          </td>
          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{cost.purpose}</td>
          <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(Number(cost.amount ?? 0))}
          </td>
        </tr>
      )),
    [deferredFilteredCosts, formatCurrency, language]
  );

  return (
    <div className="space-y-6">
      <section className="print-hidden sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Expense Overview</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[2.5rem]">
              {translate(language, "cost")}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {translate(language, "costSummary")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="dashboard-card-surface rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200/70 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800">
              Today: {formatCurrency(todayCost)}
            </span>
            <span className="dashboard-card-surface rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200/70 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800">
              Entries: {formatLocalizedNumber(costs.length, language, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </section>

      <section className="print-hidden grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <DashboardPanel tone="sky">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">New Entry</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {translate(language, "newCostEntry")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{translate(language, "recordDailyCost")}</p>
            </div>
            <span className="dashboard-card-surface rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200/70 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800">
              {formatLocalizedDate(date || todayKey, language)}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FloatingInput
                name="costPersonName"
                label={translate(language, "costForLabel")}
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                required
                inputClassName="dashboard-card-surface w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 backdrop-blur-sm transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800"
                labelClassName="bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              />

              <FloatingInput
                name="costAmount"
                type="number"
                min="0.01"
                step="0.01"
                label={translate(language, "costAmountLabel")}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                inputClassName="dashboard-card-surface w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 backdrop-blur-sm transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800"
                labelClassName="bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              />
            </div>

            <CompactDateInput
              name="costDate"
              label={translate(language, "costDateLabel")}
              value={date}
              onChange={setDate}
              max={todayIso()}
              required
              inputClassName="dashboard-card-surface mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 backdrop-blur-sm transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800"
            />

            <FloatingInput
              name="costPurpose"
              label={translate(language, "purposeLabel")}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              required
              inputClassName="dashboard-card-surface w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 backdrop-blur-sm transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800"
              labelClassName="bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            />

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-300">All submitted costs refresh the dashboard summary automatically.</p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-[#0f172a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? translate(language, "savingCost") : translate(language, "saveCost")}
              </button>
            </div>
          </form>
        </DashboardPanel>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card
              title={translate(language, "totalCost")}
              value={formatCurrency(totalCost)}
              trendPercent={`${formatLocalizedNumber(costs.length, language, { maximumFractionDigits: 0 })} ${translate(language, "entries")}`}
              trendDetail="Combined total of all recorded costs."
              trendDirection="neutral"
              visual="sparkline"
              sparklinePoints={recentCostPoints}
              icon="warning"
              tone="amber"
              accentValue
            />
            <Card
              title={translate(language, "todayCost")}
              value={formatCurrency(todayCost)}
              trendPercent={`${formatLocalizedNumber(todayEntryCount, language, { maximumFractionDigits: 0 })} ${translate(language, "entries")}`}
              trendDetail="Amount added for today's operations."
              trendDirection="neutral"
              visual="ring"
              ringPercent={todayCostSharePercent}
              icon="activity"
              tone="rose"
            />
            <Card
              title="Average Entry"
              value={formatCurrency(averageCost)}
              trendPercent={latestCost ? formatLocalizedDate(latestCost.date, language) : "-"}
              trendDetail="Average amount per saved cost entry."
              trendDirection="neutral"
              visual="ring"
              ringPercent={averageVsHighestPercent}
              icon="users"
              tone="sky"
            />
            <Card
              title="Highest Entry"
              value={formatCurrency(highestCost)}
              trendPercent={latestCost ? formatDisplayName(latestCost.personName, translate(language, "unknownPerson")) : "-"}
              trendDetail="Largest single expense in this register."
              trendDirection="neutral"
              visual="ring"
              ringPercent={highestCostSharePercent}
              icon="sales"
              tone="emerald"
            />
          </div>

        </div>
      </section>

      <DashboardPanel tone="emerald" className="print-list-shell p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">History</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {translate(language, "dailyCostHistory")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
              {translate(language, "dailyCostHistoryDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="print-hidden min-w-[15rem]">
              <CompactDateInput
                name="costHistoryFilterDate"
                label={translate(language, "dateLabel")}
                value={historyFilterDate}
                onChange={setHistoryFilterDate}
                max={todayIso()}
                inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>
            {historyFilterDate ? (
              <button
                type="button"
                onClick={() => setHistoryFilterDate("")}
                className="print-hidden inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/70 backdrop-blur-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800"
              >
                {translate(language, "cancel")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="print-hidden inline-flex items-center justify-center rounded-lg bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
            >
              {printCostListLabel}
            </button>
            <span className="dashboard-card-surface rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200/70 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800">
              {formatLocalizedNumber(deferredFilteredCosts.length, language, { maximumFractionDigits: 0 })} {translate(language, "entries")}
            </span>
            <span className="dashboard-card-surface rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200/70 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-800">
              Total {formatCurrency(filteredCostTotal)}
            </span>
          </div>
        </div>

        <div className="dashboard-card-surface mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white/80 ring-1 ring-slate-200/70 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:ring-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-[42rem] w-full text-left text-sm">
              <thead className="text-sm capitalize tracking-[0.16em] border-b border-gray-200 dark:border-gray-100  dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-4">{translate(language, "dateLabel")}</th>
                  <th className="px-4 py-4">{translate(language, "costForLabel")}</th>
                  <th className="px-4 py-4">{translate(language, "purposeLabel")}</th>
                  <th className="px-4 py-4 text-right">{translate(language, "costAmountLabel")}</th>
                </tr>
              </thead>
              <tbody>
                <LoadMoreTable
                  rows={costRows}
                  colSpan={4}
                  loadMoreLabel="Show more"
                  emptyState={
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-300">
                        {translate(language, "noCostsFound")}
                      </td>
                    </tr>
                  }
                />
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <td colSpan={3} className="px-4 py-4">
                    {translate(language, "totals")}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {formatCurrency(filteredCostTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
