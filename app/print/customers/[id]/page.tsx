import { notFound } from "next/navigation";
import mongoose from "mongoose";
import AutoPrintOnMount from "@/components/AutoPrintOnMount";
import PlainImage from "@/components/PlainImage";
import { getBalanceSummary } from "@/lib/balance";
import { connectDB } from "@/lib/db";
import { formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { getInvoiceBranding } from "@/lib/invoices";
import { translate, type Language } from "@/lib/language";
import { compareByEarliestInput, compareByLatestInput } from "@/lib/record-order";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

interface CustomerTimelinePrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; language?: string }>;
}

type UnifiedRecord = {
  _id?: string;
  date?: string | Date;
  type: "sale" | "payment";
  totalAmount: number;
  paidAmount: number;
  quantityKg: number;
  hockExtendedSack: number;
  trackExpenses: number;
};

const resolveSaleQuantity = (sale: { items?: Array<{ quantity?: number }>; saltAmount?: number }) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.reduce((sum, item) => sum + Number(item?.quantity ?? 0), 0);
  }

  return Number(sale.saltAmount ?? 0);
};

const getDateKey = (value?: string | Date) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

const getRecordKey = (record: UnifiedRecord, index: number) => record._id || `${record.type}-${index}`;

export default async function CustomerTimelinePrintPage({
  params,
  searchParams,
}: CustomerTimelinePrintPageProps) {
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
  const [customer, branding] = await Promise.all([Customer.findById(id).lean(), getInvoiceBranding()]);

  if (!customer) notFound();

  const sales = await Sale.find({ customerId: id }).sort({ createdAt: -1 }).lean();
  const payments = await Transaction.find({ customerId: id }).sort({ date: -1 }).lean();

  const saleRecords: UnifiedRecord[] = sales.map((sale) => ({
    _id: String(sale._id ?? ""),
    date: sale.createdAt,
    type: "sale",
    totalAmount: Number(sale.total ?? 0),
    paidAmount: Number(sale.paid ?? 0),
    quantityKg: resolveSaleQuantity(sale),
    hockExtendedSack: Number(sale.hockExtendedSack ?? 0),
    trackExpenses: Number(sale.trackExpenses ?? 0),
  }));

  const paymentRecords: UnifiedRecord[] = payments.map((transaction) => ({
    _id: String(transaction._id ?? ""),
    date: transaction.date,
    type: "payment",
    totalAmount: 0,
    paidAmount: Number(transaction.amount ?? 0),
    quantityKg: 0,
    hockExtendedSack: 0,
    trackExpenses: 0,
  }));

  const records = [...saleRecords, ...paymentRecords].sort((left, right) =>
    compareByLatestInput(
      { id: String(left._id ?? ""), date: left.date },
      { id: String(right._id ?? ""), date: right.date }
    )
  );

  const filteredRecords = tableFilterDate
    ? records.filter((record) => getDateKey(record.date) === tableFilterDate)
    : records;

  let runningBalance = 0;
  const runningBalanceByKey = new Map<string, number>();
  const chronologicalRecords = [...records].sort((left, right) =>
    compareByEarliestInput(
      { id: String(left._id ?? ""), date: left.date },
      { id: String(right._id ?? ""), date: right.date }
    )
  );

  for (const [index, record] of chronologicalRecords.entries()) {
    if (record.type === "sale") {
      runningBalance += record.totalAmount - record.paidAmount;
    } else {
      runningBalance -= record.paidAmount;
    }

    runningBalanceByKey.set(getRecordKey(record, index), runningBalance);
  }

  const filteredSaltDelivered = filteredRecords.reduce((sum, record) => sum + record.quantityKg, 0);
  const filteredHockExtendedSack = filteredRecords.reduce((sum, record) => sum + record.hockExtendedSack, 0);
  const filteredTrackExpenses = filteredRecords.reduce((sum, record) => sum + record.trackExpenses, 0);
  const filteredReceivedAmount = filteredRecords.reduce((sum, record) => sum + record.paidAmount, 0);
  const filteredEndingBalanceValue =
    filteredRecords.length > 0
      ? runningBalanceByKey.get(getRecordKey(filteredRecords[filteredRecords.length - 1], filteredRecords.length - 1)) ?? 0
      : 0;
  const filteredEndingBalance = getBalanceSummary(filteredEndingBalanceValue);

  return (
    <main className="mx-auto max-w-6xl bg-white p-6 print:p-0">
      <AutoPrintOnMount />

      <section className="mb-6 flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="text-2xl font-bold text-slate-900">
            {String(customer.name ?? translate(language, "customerInvoiceFallback"))}
          </p>
          <p>{String(customer.phone ?? "-")}</p>
          <p>
            {translate(language, "printDateLabel")}: {formatDate(new Date())}
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
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "dateLabel")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "typeLabel")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "saltKgShort")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "hockExtendedSack")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "trackExpenses")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "paidAmount")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "dueOrAdvance")}</th>
            <th className="border border-slate-200 px-4 py-3 text-sm font-medium">{translate(language, "note")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record, index) => {
              const recordBalance = runningBalanceByKey.get(getRecordKey(record, index)) ?? 0;
              const recordBalanceSummary = getBalanceSummary(recordBalance);

              return (
                <tr key={getRecordKey(record, index)} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="border border-slate-200 px-4 py-3">{formatDate(record.date)}</td>
                  <td className="border border-slate-200 px-4 py-3">
                    {record.type === "sale" ? translate(language, "sale") : translate(language, "payment")}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">{formatAmount(record.quantityKg)}</td>
                  <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(record.hockExtendedSack)}</td>
                  <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(record.trackExpenses)}</td>
                  <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(record.paidAmount)}</td>
                  <td className={`border border-slate-200 px-4 py-3 ${recordBalanceSummary.isAdvance ? "text-sky-600" : "text-rose-600"}`}>
                    {recordBalanceSummary.isAdvance
                      ? `${translate(language, "advanceBalance")} Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`
                      : `Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    {record.type === "sale"
                      ? translate(language, "saltSaleEntryNote")
                      : translate(language, "customerPaymentEntryNote")}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="border border-slate-200 px-4 py-8 text-center text-slate-500">
                {translate(language, "noCustomerRecordsFound")}
              </td>
            </tr>
          )}
          <tr className="bg-slate-100 font-semibold">
            <td className="border border-slate-200 px-4 py-3">{translate(language, "totals")}</td>
            <td className="border border-slate-200 px-4 py-3">-</td>
            <td className="border border-slate-200 px-4 py-3">{formatAmount(filteredSaltDelivered)}</td>
            <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(filteredHockExtendedSack)}</td>
            <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(filteredTrackExpenses)}</td>
            <td className="border border-slate-200 px-4 py-3">Tk {formatAmount(filteredReceivedAmount)}</td>
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
