"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import CompactDateInput from "@/components/CompactDateInput";
import LoadMoreTable from "@/components/LoadMoreTable";
import { translate } from "@/lib/language";
import { useLanguage } from "@/lib/useLanguage";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";

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

const parseJson = async (res: Response) => {
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

export default function CostPage() {
  const { language } = useLanguage();
  const [costs, setCosts] = useState<CostEntry[]>([]);
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
        setCosts(Array.isArray(data) ? data : []);
      }),
    []
  );

  useEffect(() => {
    void refreshCosts();
  }, [refreshCosts]);

  const totalCost = costs.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const todayCost = costs.reduce((sum, item) => {
    const itemDate = item.date ? new Date(item.date).toISOString().split("T")[0] : "";
    return itemDate === todayIso() ? sum + Number(item.amount ?? 0) : sum;
  }, 0);

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
      
      // Notify dashboard to refresh using multiple methods
      localStorage.setItem('costUpdated', Date.now().toString());
      
      // Use BroadcastChannel for reliable cross-page communication
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('dashboard-updates');
        channel.postMessage({ type: 'costAdded', timestamp: Date.now() });
        channel.close();
      }
      
      window.dispatchEvent(new CustomEvent('costAdded'));
    } catch {
      setError(translate(language, "unableToSaveCost"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const costRows = costs.map((cost, index) => (
    <tr key={cost._id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
      <td className="px-4 py-4 text-slate-700">{formatLocalizedDate(cost.date, language)}</td>
      <td className="px-4 py-4 font-medium text-slate-900">
        {formatDisplayName(cost.personName, translate(language, "unknownPerson"))}
      </td>
      <td className="px-4 py-4 text-slate-600">{cost.purpose}</td>
      <td className="px-4 py-4 text-slate-700">
        Tk {formatLocalizedNumber(Number(cost.amount ?? 0), language, { maximumFractionDigits: 2 })}
      </td>
    </tr>
  ));

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{translate(language, "cost")}</h1>
        <p className="mt-2 text-slate-500">{translate(language, "costSummary")}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-md bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{translate(language, "newCostEntry")}</h2>
          <p className="mt-2 text-sm text-slate-500">{translate(language, "recordDailyCost")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{translate(language, "costForLabel")}</span>
                <input
                  name="costPersonName"
                  value={personName}
                  onChange={(event) => setPersonName(event.target.value)}
                  placeholder={translate(language, "costForPlaceholder")}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">{translate(language, "costAmountLabel")}</span>
                <input
                  name="costAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </label>
            </div>

            <CompactDateInput
              name="costDate"
              label={translate(language, "costDateLabel")}
              value={date}
              onChange={setDate}
              max={todayIso()}
              required
              inputClassName="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />

            <label className="block">
              <span className="text-sm font-medium text-slate-700">{translate(language, "purposeLabel")}</span>
              <textarea
                name="costPurpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder={translate(language, "purposePlaceholder")}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                required
              />
            </label>

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F7FC0] disabled:opacity-60"
            >
              {isSubmitting ? translate(language, "savingCost") : translate(language, "saveCost")}
            </button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-md bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{translate(language, "totalCost")}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              Tk {formatLocalizedNumber(totalCost, language, { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="rounded-md bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{translate(language, "todayCost")}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              Tk {formatLocalizedNumber(todayCost, language, { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="rounded-md bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{translate(language, "costEntries")}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {formatLocalizedNumber(costs.length, language, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{translate(language, "dailyCostHistory")}</h2>
          <p className="mt-1 text-sm text-slate-500">{translate(language, "dailyCostHistoryDescription")}</p>
        </div>

        <table className="min-w-[38rem] w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3">{translate(language, "dateLabel")}</th>
              <th className="px-4 py-3">{translate(language, "costForLabel")}</th>
              <th className="px-4 py-3">{translate(language, "purposeLabel")}</th>
              <th className="px-4 py-3">{translate(language, "costAmountLabel")}</th>
            </tr>
          </thead>
          <tbody>
            <LoadMoreTable
              rows={costRows}
              colSpan={4}
              loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
              emptyState={
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    {translate(language, "noCostsFound")}
                  </td>
                </tr>
              }
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
