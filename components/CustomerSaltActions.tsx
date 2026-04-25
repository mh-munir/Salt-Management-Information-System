"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  customerId: string;
};

const CustomerSaltActions = ({ customerId }: Props) => {
  const router = useRouter();
  const [mode, setMode] = useState<"sale" | "buy">("sale");
  const [saltAmount, setSaltAmount] = useState("");
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const totalValue = Number(total) || 0;
    const paidValue = Number(paid) || 0;
    const dueValue = Math.max(0, totalValue - paidValue);
    setDue(dueValue.toFixed(2));
  }, [total, paid]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const saltValue = Number(saltAmount);
    const totalValue = Number(total);
    const paidValue = Number(paid);
    const dueValue = Number(due);

    if (saltAmount.trim() === "" || Number.isNaN(saltValue) || saltValue < 0) {
      setStatus({ type: "error", message: "Salt amount must be a valid non-negative number." });
      return;
    }

    if (total.trim() === "" || Number.isNaN(totalValue) || totalValue < 0) {
      setStatus({ type: "error", message: "Total amount must be a valid non-negative number." });
      return;
    }

    if (paid.trim() === "" || Number.isNaN(paidValue) || paidValue < 0) {
      setStatus({ type: "error", message: "Paid amount must be a valid non-negative number." });
      return;
    }

    if (paidValue > totalValue) {
      setStatus({ type: "error", message: "Paid amount cannot be greater than total amount." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          saltAmount: saltValue,
          total: totalValue,
          paid: paidValue,
          due: dueValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: data.message || "Unable to save the record." });
        return;
      }

      setStatus({ type: "success", message: data.message || `Recorded ${mode} salt successfully.` });
      setSaltAmount("");
      setTotal("");
      setPaid("");
      setDue("");
      router.refresh();
    } catch {
      setStatus({ type: "error", message: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-md bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Sale / Buy salt entry</h2>
          <p className="text-sm text-slate-500">
            Record daily sale or buy salt with amount, total price, paid money and due.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("sale")}
            className={`button-utility rounded-lg px-4 py-2 text-base font-medium ${mode === "sale" ? "bg-[#348CD4] text-white" : "text-slate-600"}`}
          >
            Sale salt
          </button>
          <button
            type="button"
            onClick={() => setMode("buy")}
            className={`button-utility rounded-lg px-4 py-2 text-base font-medium ${mode === "buy" ? "bg-[#348CD4] text-white" : "text-slate-600"}`}
          >
            Buy salt
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-lg font-medium text-slate-700">Salt quantity (kg)</span>
            <input
              name="saltAmount"
              value={saltAmount}
              onChange={(event) => setSaltAmount(event.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-lg font-medium text-slate-700">Total amount (Tk)</span>
            <input
              name="totalAmount"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-lg font-medium text-slate-700">Paid amount (Tk)</span>
            <input
              name="paidAmount"
              value={paid}
              onChange={(event) => setPaid(event.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-lg font-medium text-slate-700">Due amount (Tk)</span>
            <input
              name="dueAmount"
              value={due}
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              readOnly
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-lg text-slate-900 outline-none"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {mode === "sale"
              ? "Sale salt will be added to customer salt totals and due will be recorded."
              : "Buy salt will reduce customer salt totals and adjust due accordingly."}
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl bg-[#348CD4] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#2F7FC0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : `Save ${mode === "sale" ? "sale" : "buy"} record`}
          </button>
        </div>

        {status ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {status.message}
          </div>
        ) : null}
      </form>
    </div>
  );
};

export default CustomerSaltActions;
