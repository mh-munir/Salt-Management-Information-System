"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadMoreTable from "@/components/LoadMoreTable";
import { translate } from "@/lib/language";
import { useLanguage } from "@/lib/useLanguage";
import { formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";

type Transaction = {
  _id: string;
  amount?: number;
  date?: string | Date;
  type?: string;
  supplierId?: string;
  customerId?: string;
};

export default function Transactions() {
  const [data, setData] = useState<Transaction[]>([]);
  const { language } = useLanguage();

  useEffect(() => {
    const parseJson = async (res: Response) => {
      if (!res.ok) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    };

    fetch("/api/transactions", { cache: "no-store" })
      .then(parseJson)
      .then((items) => setData(Array.isArray(items) ? items : []));
  }, []);

  const supplierTransactions = data.filter((t) => t.supplierId);
  const customerTransactions = data.filter((t) => t.customerId);

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{translate(language, "transactions")}</h1>
        <p className="mt-2 text-slate-500">{translate(language, "transactionsPageDescription")}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-md bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">{translate(language, "supplierTransactions")}</h2>
          <table className="min-w-[40rem] text-left text-base">
            <thead className="border-b border-slate-200 text-sm text-slate-500">
              <tr>
                <th className="px-4 py-3">{translate(language, "dateLabel")}</th>
                <th className="px-4 py-3">{translate(language, "typeLabel")}</th>
                <th className="px-4 py-3">{translate(language, "amountLabel")}</th>
                <th className="px-4 py-3">{translate(language, "printInvoice")}</th>
              </tr>
            </thead>
            <tbody>
              <LoadMoreTable
              items={supplierTransactions}
              colSpan={4}
              loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
              emptyState={
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-base text-slate-500">
                    {translate(language, "noSupplierTransactions")}
                  </td>
                </tr>
              }
              renderRows={(visibleTransactions) =>
                visibleTransactions.map((t, index) => (
                  <tr key={t._id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-4 text-base text-slate-800">{formatLocalizedDate(t.date, language)}</td>
                    <td className="px-4 py-4 text-base text-slate-600">{t.type}</td>
                    <td className="px-4 py-4 text-base text-slate-600">
                      Tk {formatLocalizedNumber(Number(t.amount ?? 0), language, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/invoices/suppliers/${t.supplierId}`}
                        target="_blank"
                        className="text-base font-medium text-emerald-700 hover:underline"
                      >
                        Print
                      </Link>
                    </td>
                  </tr>
                ))
              }
            />
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-md bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">{translate(language, "customerTransactions")}</h2>
          <table className="min-w-[40rem] text-left text-base">
            <thead className="border-b border-slate-200 text-sm text-slate-500">
              <tr>
                <th className="px-4 py-3">{translate(language, "dateLabel")}</th>
                <th className="px-4 py-3">{translate(language, "typeLabel")}</th>
                <th className="px-4 py-3">{translate(language, "amountLabel")}</th>
                <th className="px-4 py-3">{translate(language, "printInvoice")}</th>
              </tr>
            </thead>
            <tbody>
            <LoadMoreTable
              items={customerTransactions}
              colSpan={4}
              loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
              emptyState={
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-base text-slate-500">
                    {translate(language, "noCustomerTransactions")}
                  </td>
                </tr>
              }
              renderRows={(visibleTransactions) =>
                visibleTransactions.map((t, index) => (
                  <tr key={t._id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-4 text-base text-slate-800">{formatLocalizedDate(t.date, language)}</td>
                    <td className="px-4 py-4 text-base text-slate-600">{t.type}</td>
                    <td className="px-4 py-4 text-base text-slate-600">
                      Tk {formatLocalizedNumber(Number(t.amount ?? 0), language, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/invoices/customers/${t.customerId}`}
                        target="_blank"
                        className="text-base font-medium text-emerald-700 hover:underline"
                      >
                        Print
                      </Link>
                    </td>
                  </tr>
                ))
              }
            />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
