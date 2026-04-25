import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import LoadMoreTable from "@/components/LoadMoreTable";
import TableDateFilterToolbar from "@/components/TableDateFilterToolbar";
import { getBalanceSummary } from "@/lib/balance";
import { connectDB } from "@/lib/db";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { translate } from "@/lib/language";
import { summarizeCustomerLedger } from "@/lib/live-ledgers";
import { compareByEarliestInput, compareByLatestInput } from "@/lib/record-order";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

interface CustomerPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
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
const getDateKey = (value?: string | Date) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

const statToneStyles = {
  indigo: {
    shell: "border-indigo-100/80",
    accent: "from-indigo-500/18 via-indigo-500/8 to-transparent",
    label: "text-indigo-700",
    value: "text-indigo-700",
    meta: "text-indigo-600/80",
  },
  emerald: {
    shell: "border-emerald-100/80",
    accent: "from-emerald-500/18 via-emerald-500/8 to-transparent",
    label: "text-emerald-700",
    value: "text-emerald-700",
    meta: "text-emerald-600/80",
  },
  amber: {
    shell: "border-amber-100/80",
    accent: "from-amber-500/18 via-amber-500/8 to-transparent",
    label: "text-amber-700",
    value: "text-amber-700",
    meta: "text-amber-600/80",
  },
  rose: {
    shell: "border-rose-100/80",
    accent: "from-rose-500/18 via-rose-500/8 to-transparent",
    label: "text-rose-700",
    value: "text-rose-700",
    meta: "text-rose-600/80",
  },
} as const;

function SnapshotCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta: string;
  tone: keyof typeof statToneStyles;
}) {
  const palette = statToneStyles[tone];

  return (
    <div className={`relative overflow-hidden rounded-3xl border bg-white/90 p-5 shadow-sm ${palette.shell}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-br ${palette.accent}`} />
      <div className="relative">
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${palette.label}`}>{label}</p>
        <p className={`mt-4 text-2xl font-semibold tracking-tight sm:text-[1.9rem] ${palette.value}`}>{value}</p>
        <p className={`mt-2 text-sm ${palette.meta}`}>{meta}</p>
      </div>
    </div>
  );
}

export default async function CustomerDetailPage({ params, searchParams }: CustomerPageProps) {
  const { id } = await params;
  const query = await searchParams;
  await connection();
  await connectDB();

  const cookieStore = await cookies();
  const language = (cookieStore.get("salt-mill-language")?.value as "en" | "bn") || "en";
  const formatDate = (value?: string | Date) => formatLocalizedDate(value, language);
  const formatAmount = (value: number) =>
    formatLocalizedNumber(value, language, {
      maximumFractionDigits: 0,
    });
  const tableFilterDate = typeof query.date === "string" ? query.date : "";
  const maxFilterDate = new Date().toISOString().split("T")[0];

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
  const totalHockExtendedSack = sales.reduce((sum, sale) => sum + Number(sale.hockExtendedSack ?? 0), 0);
  const totalTrackExpenses = sales.reduce((sum, sale) => sum + Number(sale.trackExpenses ?? 0), 0);
  const profileImage = createProfileAvatar(String(customer.name ?? "Customer"), "customer");
  const averageSalePerKg = totalSaltDelivered > 0 ? totalSalesAmount / totalSaltDelivered : 0;
  const latestActivityDate = records[0]?.date;

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

  const filteredSalesAmount = filteredRecords.reduce((sum, record) => sum + record.totalAmount, 0);
  const filteredReceivedAmount = filteredRecords.reduce((sum, record) => sum + record.paidAmount, 0);
  const filteredSaltDelivered = filteredRecords.reduce((sum, record) => sum + record.quantityKg, 0);
  const filteredHockExtendedSack = filteredRecords.reduce((sum, record) => sum + record.hockExtendedSack, 0);
  const filteredTrackExpenses = filteredRecords.reduce((sum, record) => sum + record.trackExpenses, 0);
  const filteredEndingBalanceValue =
    filteredRecords.length > 0
      ? runningBalanceByKey.get(getRecordKey(filteredRecords[filteredRecords.length - 1], filteredRecords.length - 1)) ?? 0
      : 0;
  const filteredEndingBalance = getBalanceSummary(filteredEndingBalanceValue);

  const recordRows = filteredRecords.map((record, index) => {
    const recordBalance = runningBalanceByKey.get(getRecordKey(record, index)) ?? 0;
    const recordBalanceSummary = getBalanceSummary(recordBalance);

    return (
      <tr
        key={getRecordKey(record, index)}
        className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
      >
        <td className="px-4 py-4 text-sm text-slate-800">{formatDate(record.date)}</td>
        <td className="px-4 py-4 text-sm">
          <span
            className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-semibold ${
              record.type === "sale" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {record.type === "sale" ? translate(language, "sale") : translate(language, "payment")}
          </span>
        </td>
        <td className="px-4 py-4 text-sm text-slate-700">{formatAmount(record.quantityKg)}</td>
        <td className="px-4 py-4 text-sm text-slate-700">Tk {formatAmount(record.hockExtendedSack)}</td>
        <td className="px-4 py-4 text-sm text-slate-700">Tk {formatAmount(record.trackExpenses)}</td>
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
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-linear-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-lg bg-emerald-200/50 blur-3xl" />
        <div className="pointer-events-none absolute left-8 top-8 h-28 w-28 rounded-lg bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-lg bg-cyan-200/40 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)] xl:items-stretch">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/customers"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-50"
              >
                <span aria-hidden="true">&larr;</span>
                Customers
              </Link>
              <span className="inline-flex rounded-lg border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {translate(language, "customerProfile")}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
              <Image
                src={profileImage}
                alt={`${customer.name || "Customer"} profile`}
                width={88}
                height={88}
                className="size-22 rounded-[26px] border border-slate-200/80 object-cover shadow-sm"
              />

              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.4rem]">
                  {formatDisplayName(String(customer.name ?? ""), "Customer")}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[0.95rem]">
                  {translate(language, "customerSummary")} This view keeps sales, receipts, and due balance visible in one modern workspace.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                    {translate(language, "phoneLabel")}: {customer.phone || "-"}
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                    {translate(language, "addressLabel")}: {customer.address || "-"}
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                    {records.length} {translate(language, "entries")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Average sale rate</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {averageSalePerKg > 0 ? `Tk ${formatAmount(averageSalePerKg)}` : "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Per kg realized from all sales</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest activity</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {latestActivityDate ? formatDate(latestActivityDate) : "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Most recent sale or payment entry</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cost recovery</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Tk {formatAmount(totalTrackExpenses)}</p>
                <p className="mt-1 text-xs text-slate-500">Tracked expenses absorbed through customer sales</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/invoices/customers/${id}`}
                target="_blank"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2F7FC0] sm:w-auto"
              >
                {translate(language, "printInvoice")}
              </Link>
              <Link
                href={`/customers?paymentId=${id}&returnTo=${encodeURIComponent(`/customers/${id}`)}`}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
              >
                {translate(language, "paymentNow")}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SnapshotCard
              label={translate(language, "totalSalesLabel")}
              value={`Tk ${formatAmount(totalSalesAmount)}`}
              meta="Combined customer sales across the full ledger"
              tone="indigo"
            />
            <SnapshotCard
              label={translate(language, balance.isAdvance ? "advanceBalance" : "outstandingDue")}
              value={`Tk ${formatAmount(balance.absoluteAmount)}`}
              meta={balance.isAdvance ? "Customer currently has an advance balance" : "Receivable amount still outstanding"}
              tone={balance.isAdvance ? "emerald" : "rose"}
            />
            <SnapshotCard
              label={translate(language, "totalReceived")}
              value={`Tk ${formatAmount(totalReceived)}`}
              meta="Total cash collected from sales and payments"
              tone="emerald"
            />
            <SnapshotCard
              label={translate(language, "saltDelivered")}
              value={`${formatAmount(totalSaltDelivered)} KG`}
              meta={`Hock Tk ${formatAmount(totalHockExtendedSack)}`}
              tone="amber"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ledger timeline</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{translate(language, "customerActivityTimeline")}</h2>
            <p className="mt-2 text-sm text-slate-500">{translate(language, "activityTimelineDescription")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              {filteredRecords.length} {translate(language, "entries")}
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              Sales Tk {formatAmount(filteredSalesAmount)}
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              Received Tk {formatAmount(filteredReceivedAmount)}
            </span>
            <TableDateFilterToolbar
              language={language}
              value={tableFilterDate}
              max={maxFilterDate}
              printLabel={translate(language, "print")}
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-[48rem] w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "dateLabel")}</th>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "typeLabel")}</th>
                  <th className="px-4 py-4 text-sm font-medium">Salt (KG)</th>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "hockExtendedSack")}</th>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "trackExpenses")}</th>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "paidAmount")}</th>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "dueOrAdvance")}</th>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "note")}</th>
                </tr>
              </thead>
              <tbody>
                <LoadMoreTable
                  rows={recordRows}
                  colSpan={8}
                  loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
                  emptyState={
                    <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                        No records found for this customer.
                      </td>
                    </tr>
                  }
                />

                <tr className="border-t border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-800">
                  <td className="px-4 py-4 text-sm">Totals</td>
                  <td className="px-4 py-4 text-sm">-</td>
                  <td className="px-4 py-4 text-sm">{formatAmount(filteredSaltDelivered)}</td>
                  <td className="px-4 py-4 text-sm">Tk {formatAmount(filteredHockExtendedSack)}</td>
                  <td className="px-4 py-4 text-sm">Tk {formatAmount(filteredTrackExpenses)}</td>
                  <td className="px-4 py-4 text-sm">Tk {formatAmount(filteredReceivedAmount)}</td>
                  <td className={`px-4 py-4 text-sm ${filteredEndingBalance.isAdvance ? "text-emerald-600" : "text-rose-600"}`}>
                    {filteredEndingBalance.isAdvance
                      ? `${translate(language, "advanceBalance")} Tk ${formatAmount(filteredEndingBalance.absoluteAmount)}`
                      : `Tk ${formatAmount(filteredEndingBalance.absoluteAmount)}`}
                  </td>
                  <td className="px-4 py-4 text-sm">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

