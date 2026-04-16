import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import mongoose from "mongoose";
import { getBalanceSummary } from "@/lib/balance";
import { connectDB } from "@/lib/db";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import LoadMoreTable from "@/components/LoadMoreTable";
import { translate } from "@/lib/language";
import { summarizeCustomerLedger } from "@/lib/live-ledgers";
import { compareByEarliestInput, compareByLatestInput } from "@/lib/record-order";
import { cookies } from "next/headers";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

type UnifiedRecord = {
  _id?: string;
  date?: string | Date;
  type: "sale" | "payment";
  totalAmount: number;
  paidAmount: number;
  quantityKg: number;
};

const createProfileAvatar = (name: string, variant: "supplier" | "customer") => {
  const initial = (name.trim().charAt(0) || "U").toUpperCase();
  const [colorA, colorB] =
    variant === "supplier" ? ["#4f46e5", "#7c3aed"] : ["#059669", "#0ea5e9"];

  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
      <defs>
        <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='${colorA}' />
          <stop offset='100%' stop-color='${colorB}' />
        </linearGradient>
      </defs>
      <rect width='160' height='160' rx='80' fill='url(#g)' />
      <circle cx='80' cy='68' r='30' fill='rgba(255,255,255,0.25)' />
      <path d='M38 130c7-22 23-34 42-34s35 12 42 34' fill='rgba(255,255,255,0.25)' />
      <text x='80' y='92' text-anchor='middle' font-size='48' font-family='Arial, sans-serif' font-weight='700' fill='white'>
        ${initial}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const resolveSaleQuantity = (sale: { items?: Array<{ quantity?: number }>; saltAmount?: number }) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.reduce((sum, item) => sum + Number(item?.quantity ?? 0), 0);
  }

  return Number(sale.saltAmount ?? 0);
};

const getRecordKey = (record: UnifiedRecord, index: number) => record._id || `${record.type}-${index}`;

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const { id } = await params;
  await connection();
  await connectDB();

  const cookieStore = await cookies();
  const language = (cookieStore.get("salt-mill-language")?.value as "en" | "bn") || "en";
  const formatDate = (value?: string | Date) => formatLocalizedDate(value, language);
  const formatAmount = (value: number) =>
    formatLocalizedNumber(value, language, {
      maximumFractionDigits: 0,
    });

  if (!mongoose.isValidObjectId(id)) notFound();

  const customer = await Customer.findById(id).lean();
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
  }));

  const paymentRecords: UnifiedRecord[] = payments.map((transaction) => ({
    _id: String(transaction._id ?? ""),
    date: transaction.date,
    type: "payment",
    totalAmount: 0,
    paidAmount: Number(transaction.amount ?? 0),
    quantityKg: 0,
  }));

  const records = [...saleRecords, ...paymentRecords].sort((left, right) =>
    compareByLatestInput(
      { id: String(left._id ?? ""), date: left.date },
      { id: String(right._id ?? ""), date: right.date }
    )
  );

  const summary = summarizeCustomerLedger(sales, payments, {
    saltAmount: customer.saltAmount,
    totalDue: customer.totalDue,
    totalPaid: customer.totalPaid,
  });
  const totalSalesAmount = summary.totalSalesAmount;
  const totalReceived = summary.totalReceivedAmount;
  const totalSaltDelivered = summary.totalSaltKg;
  const totalDue = summary.totalDueAmount;
  const balance = getBalanceSummary(totalDue);
  const profileImage = createProfileAvatar(String(customer.name ?? "Customer"), "customer");

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

  const recordRows = records.map((record, index) => {
    const recordBalance = runningBalanceByKey.get(getRecordKey(record, index)) ?? 0;
    const recordBalanceSummary = getBalanceSummary(recordBalance);

    return (
      <tr
        key={getRecordKey(record, index)}
        className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
      >
        <td className="px-4 py-4 text-sm text-slate-800">{formatDate(record.date)}</td>
        <td className="px-4 py-4">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              record.type === "sale" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {record.type === "sale" ? translate(language, "sale") : translate(language, "payment")}
          </span>
        </td>
        <td className="px-4 py-4 text-sm text-slate-700">{formatAmount(record.quantityKg)}</td>
        <td className="px-4 py-4 text-sm text-slate-700">Tk {formatAmount(record.paidAmount)}</td>
        <td className={`px-4 py-4 text-sm ${recordBalanceSummary.isAdvance ? "text-emerald-600" : "text-rose-600"}`}>
          {recordBalanceSummary.isAdvance
            ? `${translate(language, "advanceBalance")} Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`
            : `Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`}
        </td>
        <td className="px-4 py-4 text-sm text-slate-500">
          {record.type === "sale" ? "Salt sale entry" : "Customer payment entry"}
        </td>
      </tr>
    );
  });

  return (
    <div className="space-y-4">
      <section className="relative ">
        <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[30%_70%] xl:items-stretch">
          <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Image
                src={profileImage}
                alt={`${customer.name || "Customer"} profile`}
                width={72}
                height={72}
                className="size-18 rounded-2xl border border-white/70 object-cover shadow-sm"
              />

              <div className="min-w-0">
                <p className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {translate(language, "customerProfile")}
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {formatDisplayName(String(customer.name ?? ""), "Customer")}
                </h1>
                <p className="mt-2 text-sm text-slate-600">{translate(language, "customerSummary")}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {translate(language, "phoneLabel")}: {customer.phone || "-"}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {translate(language, "addressLabel")}: {customer.address || "-"}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/invoices/customers/${id}`}
                target="_blank"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2F7FC0] sm:w-auto"
              >
                {translate(language, "printInvoice")}
              </Link>
              <Link
                href={`/customers?paymentId=${id}&returnTo=${encodeURIComponent(`/customers/${id}`)}`}
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
              >
                {translate(language, "paymentNow")}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">{translate(language, "totalSalesLabel")}</p>
              <p className="mt-3 text-2xl font-semibold text-indigo-600">Tk {formatAmount(totalSalesAmount)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {translate(language, balance.isAdvance ? "advanceBalance" : "outstandingDue")}
              </p>
              <p className={`mt-3 text-2xl font-semibold ${balance.isAdvance ? "text-emerald-600" : "text-rose-600"}`}>
                Tk {formatAmount(balance.absoluteAmount)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">{translate(language, "totalReceived")}</p>
              <p className="mt-3 text-2xl font-semibold text-emerald-600">Tk {formatAmount(totalReceived)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">{translate(language, "saltDelivered")}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{formatAmount(totalSaltDelivered)} KG</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{translate(language, "customerActivityTimeline")}</h2>
            <p className="text-sm text-slate-500">{translate(language, "activityTimelineDescription")}</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {records.length} {translate(language, "entries")}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[44rem] w-full text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{translate(language, "dateLabel")}</th>
                <th className="px-4 py-3">{translate(language, "typeLabel")}</th>
                <th className="px-4 py-3">Salt (KG)</th>
                <th className="px-4 py-3">{translate(language, "paidAmount")}</th>
                <th className="px-4 py-3">{translate(language, "dueOrAdvance")}</th>
                <th className="px-4 py-3">{translate(language, "note")}</th>
              </tr>
            </thead>
            <tbody>
              <LoadMoreTable
                rows={recordRows}
                colSpan={6}
                loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
                emptyState={
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      No records found for this customer.
                    </td>
                  </tr>
                }
              />

              <tr className="border-t border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-800">
                <td className="px-4 py-4">Totals</td>
                <td className="px-4 py-4">-</td>
                <td className="px-4 py-4">{formatAmount(totalSaltDelivered)}</td>
                <td className="px-4 py-4">Tk {formatAmount(totalReceived)}</td>
                <td className={`px-4 py-4 ${balance.isAdvance ? "text-emerald-600" : "text-rose-600"}`}>
                  {balance.isAdvance
                    ? `${translate(language, "advanceBalance")} Tk ${formatAmount(balance.absoluteAmount)}`
                    : `Tk ${formatAmount(balance.absoluteAmount)}`}
                </td>
                <td className="px-4 py-4">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
