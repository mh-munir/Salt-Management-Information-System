import { notFound } from "next/navigation";
import mongoose from "mongoose";
import AutoPrintOnMount from "@/components/AutoPrintOnMount";
import PlainImage from "@/components/PlainImage";
import { connectDB } from "@/lib/db";
import { formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { getBalanceSummary } from "@/lib/balance";
import { compareByEarliestInput, compareByLatestInput } from "@/lib/record-order";
import { translate, type Language } from "@/lib/language";
import { getInvoiceBranding } from "@/lib/invoices";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

interface SupplierTimelinePrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; language?: string }>;
}

const getDateKey = (value?: string | Date) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

export default async function SupplierTimelinePrintPage({
  params,
  searchParams,
}: SupplierTimelinePrintPageProps) {
  const { id } = await params;
  const query = await searchParams;

  if (!mongoose.isValidObjectId(id)) notFound();

  await connectDB();

  const language: Language = query.language === "bn" ? "bn" : "en";
  const formatDate = (value?: string | Date) => formatLocalizedDate(value, language);
  const formatAmount = (value: number) =>
    formatLocalizedNumber(value, language, {
      maximumFractionDigits: 0,
    });

  const tableFilterDate = typeof query.date === "string" ? query.date : "";
  const [supplier, branding] = await Promise.all([Supplier.findById(id).lean(), getInvoiceBranding()]);

  if (!supplier) notFound();

  const records = (await Transaction.find({ supplierId: id }).lean()).sort((left, right) =>
    compareByLatestInput(
      { id: String(left._id ?? ""), date: left.date },
      { id: String(right._id ?? ""), date: right.date }
    )
  );

  const filteredRecords = tableFilterDate
    ? records.filter((record) => getDateKey(record.date) === tableFilterDate)
    : records;

  let runningBalance = 0;
  const runningBalanceById = new Map<string, number>();
  const chronologicalRecords = [...records].sort((a, b) =>
    compareByEarliestInput(
      { id: String(a._id ?? ""), date: a.date },
      { id: String(b._id ?? ""), date: b.date }
    )
  );

  for (const record of chronologicalRecords) {
    if (record.type === "buy" || record.type === "supplier-buy") {
      runningBalance += Number(record.totalAmount ?? 0) - Number(record.amount ?? 0);
    } else {
      runningBalance -= Number(record.amount ?? 0);
    }

    runningBalanceById.set(String(record._id ?? ""), runningBalance);
  }

  const filteredTotalPaid = filteredRecords.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
  const filteredTotalSaltMoved = filteredRecords.reduce((sum, record) => sum + Number(record.saltAmount ?? 0), 0);
  const filteredEstimatedPurchase = filteredRecords.reduce((sum, record) => sum + Number(record.totalAmount ?? 0), 0);
  const filteredAveragePurchasePerMaund =
    filteredTotalSaltMoved > 0 ? filteredEstimatedPurchase / filteredTotalSaltMoved : 0;
  const filteredEndingBalanceValue =
    filteredRecords.length > 0
      ? runningBalanceById.get(String(filteredRecords[filteredRecords.length - 1]._id ?? "")) ?? 0
      : 0;
  const filteredEndingBalance = getBalanceSummary(filteredEndingBalanceValue);

  return (
    <main className="mx-auto max-w-6xl bg-white p-6 print:p-0">
      <AutoPrintOnMount />

      <section className="mb-6 flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="text-2xl font-bold text-slate-900">{String(supplier.name ?? "Supplier")}</p>
          <p>{String(supplier.phone ?? "-")}</p>
          <p>
            Print Date: {formatDate(new Date())}
          </p>
        </div>

        <div className="flex items-start gap-3 text-right">
          {branding.logoUrl ? (
            <div className="h-14 w-14 overflow-hidden rounded border border-slate-200 bg-white">
              <PlainImage src={branding.logoUrl} alt={`${branding.heading} logo`} className="h-full w-full object-contain" />
            </div>
          ) : null}
          <div>
            <p className="text-lg font-bold text-slate-900">{branding.heading}</p>
            <p className="text-sm text-slate-600">{branding.subheading}</p>
          </div>
        </div>
      </section>

      <table className="w-full border-collapse text-left text-sm text-slate-800">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">Date</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">Type</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">Salt (MAUND)</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">Paid amount</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "dueOrAdvance")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record, index) => {
              const isPurchase = record.type === "buy" || record.type === "supplier-buy";
              const saltMaund = Number(record.saltAmount ?? 0);
              const totalPurchaseAmount = Number(record.totalAmount ?? 0);
              const recordBalance = runningBalanceById.get(String(record._id ?? "")) ?? 0;
              const recordBalanceSummary = getBalanceSummary(recordBalance);
              const perMaundPrice =
                isPurchase && saltMaund > 0 && totalPurchaseAmount > 0 ? totalPurchaseAmount / saltMaund : 0;

              return (
                <tr key={String(record._id ?? record.date?.toString())} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="border border-slate-200 px-4 py-3">{formatDate(record.date)}</td>
                  <td className="border border-slate-200 px-4 py-3">{isPurchase ? "Purchase" : "Payment"}</td>
                  <td className="border border-slate-200 px-4 py-3">
                    <div>{formatAmount(saltMaund)}</div>
                    <div className="text-xs text-slate-500">
                      {isPurchase && perMaundPrice > 0 ? `Per maund Tk ${formatAmount(perMaundPrice)}` : "-"}
                    </div>
                  </td>
                  <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(Number(record.amount ?? 0))}</td>
                  <td className={`border border-slate-200 px-4 py-3 ${recordBalanceSummary.isAdvance ? "text-sky-600" : "text-rose-600"}`}>
                    {recordBalanceSummary.isAdvance
                      ? `${translate(language, "advanceBalance")} Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`
                      : `Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    {isPurchase ? "Salt purchase entry" : "Supplier payment entry"}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="border border-slate-200 px-4 py-8 text-center text-slate-500">
                No records found for this supplier.
              </td>
            </tr>
          )}
          <tr className="bg-slate-100 font-semibold">
            <td className="border border-slate-200 px-4 py-3">Totals</td>
            <td className="border border-slate-200 px-4 py-3">-</td>
            <td className="border border-slate-200 px-4 py-3">
              <div>{formatAmount(filteredTotalSaltMoved)}</div>
              <div className="text-xs font-medium text-slate-500">
                {filteredAveragePurchasePerMaund > 0 ? `Per maund Tk ${formatAmount(filteredAveragePurchasePerMaund)}` : "-"}
              </div>
            </td>
            <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(filteredTotalPaid)}</td>
            <td className={`border border-slate-200 px-4 py-3 ${filteredEndingBalance.isAdvance ? "text-sky-600" : "text-rose-600"}`}>
              {filteredEndingBalance.isAdvance
                ? `${translate(language, "advanceBalance")} Tk ${formatAmount(filteredEndingBalance.absoluteAmount)}`
                : `Tk ${formatAmount(filteredEndingBalance.absoluteAmount)}`}
            </td>
            <td className="border border-slate-200 px-4 py-3">-</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
