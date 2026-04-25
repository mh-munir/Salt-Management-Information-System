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
import { summarizeSupplierLedger } from "@/lib/live-ledgers";
import { compareByEarliestInput, compareByLatestInput } from "@/lib/record-order";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

interface SupplierPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}

const getDateKey = (value?: string | Date) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
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

export default async function SupplierDetailPage({ params, searchParams }: SupplierPageProps) {
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

  const supplier = await Supplier.findById(id).lean();
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

  const summary = summarizeSupplierLedger(records, {
    saltAmount: supplier.saltAmount,
    totalPaid: supplier.totalPaid,
    totalDue: supplier.totalDue,
  });
  const totalPaid = summary.totalPaidAmount;
  const totalSaltMoved = summary.totalSaltKg;
  const totalDue = summary.totalDueAmount;
  const estimatedTotalPurchase = summary.totalPurchaseAmount;
  const balance = getBalanceSummary(totalDue);
  const profileImage = createProfileAvatar(String(supplier.name ?? "Supplier"), "supplier");
  const averagePurchasePerMaund = totalSaltMoved > 0 ? estimatedTotalPurchase / totalSaltMoved : 0;
  const latestActivityDate = records[0]?.date;

  let runningBalance = 0;
  const runningBalanceById = new Map<string, number>();
  const chronologicalRecords = [...records].sort((a, b) => {
    return compareByEarliestInput(
      { id: String(a._id ?? ""), date: a.date },
      { id: String(b._id ?? ""), date: b.date }
    );
  });
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

  const recordRows = filteredRecords.map((record, index) => {
    const isPurchase = record.type === "buy" || record.type === "supplier-buy";
    const saltMaund = Number(record.saltAmount ?? 0);
    const totalPurchaseAmount = Number(record.totalAmount ?? 0);
    const recordBalance = runningBalanceById.get(String(record._id ?? "")) ?? 0;
    const recordBalanceSummary = getBalanceSummary(recordBalance);
    const perMaundPrice =
      isPurchase && saltMaund > 0 && totalPurchaseAmount > 0 ? totalPurchaseAmount / saltMaund : 0;

    return (
      <tr
        key={String(record._id ?? record.date?.toString())}
        className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
      >
        <td className="px-4 py-4 text-sm text-slate-800">{formatDate(record.date)}</td>
        <td className="px-4 py-4 text-sm">
          <span
            className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-semibold ${
              isPurchase ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isPurchase ? "Purchase" : "Payment"}
          </span>
        </td>
        <td className="px-4 py-4 text-sm text-slate-700">
          <div>{formatAmount(saltMaund)}</div>
          <div className="text-sm text-slate-500">
            {isPurchase && perMaundPrice > 0 ? `Per maund Tk ${formatAmount(perMaundPrice)}` : "-"}
          </div>
        </td>
        <td className="px-4 py-4 text-sm text-slate-700">Tk {formatAmount(Number(record.amount ?? 0))}</td>
        <td className={`px-4 py-4 text-sm ${recordBalanceSummary.isAdvance ? "text-emerald-600" : "text-rose-600"}`}>
          {recordBalanceSummary.isAdvance
            ? `${translate(language, "advanceBalance")} Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`
            : `Tk ${formatAmount(recordBalanceSummary.absoluteAmount)}`}
        </td>
        <td className="px-4 py-4 text-sm text-slate-500">
          {isPurchase ? "Salt purchase entry" : "Supplier payment entry"}
        </td>
      </tr>
    );
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-linear-to-br from-indigo-50 via-white to-sky-50 p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-8 -top-14 h-40 w-40 rounded-lg bg-indigo-200/50 blur-3xl" />
        <div className="pointer-events-none absolute left-8 top-10 h-28 w-28 rounded-lg bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-lg bg-violet-200/40 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)] xl:items-stretch">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/suppliers"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-50"
              >
                <span aria-hidden="true">&larr;</span>
                Suppliers
              </Link>
              <span className="inline-flex rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                Supplier profile
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
              <Image
                src={profileImage}
                alt={`${supplier.name || "Supplier"} profile`}
                width={88}
                height={88}
                className="size-22 rounded-[26px] border border-slate-200/80 object-cover shadow-sm"
              />

              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.4rem]">
                  {formatDisplayName(String(supplier.name ?? ""), "Supplier")}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[0.95rem]">
                  Supplier account details, purchase flow, and payment balance are organized here in the same command-center style as the dashboard.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                    Phone: {supplier.phone || "-"}
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                    Address: {supplier.address || "-"}
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                    {records.length} {translate(language, "entries")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Average rate</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {averagePurchasePerMaund > 0 ? `Tk ${formatAmount(averagePurchasePerMaund)}` : "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Per maund purchase average</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest activity</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {latestActivityDate ? formatDate(latestActivityDate) : "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Most recent supplier entry date</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Balance status</p>
                <p className={`mt-2 text-lg font-semibold ${balance.isAdvance ? "text-emerald-600" : "text-rose-600"}`}>
                  {balance.isAdvance ? translate(language, "advanceBalance") : translate(language, "outstandingDue")}
                </p>
                <p className="mt-1 text-xs text-slate-500">Live summary from purchase and payment history</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/invoices/suppliers/${id}`}
                target="_blank"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2F7FC0] sm:w-auto"
              >
                {translate(language, "printInvoice")}
              </Link>
              <Link
                href={`/suppliers?paymentId=${id}&returnTo=${encodeURIComponent(`/suppliers/${id}`)}`}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
              >
                {translate(language, "paymentNow")}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SnapshotCard
              label="Total amount"
              value={`Tk ${formatAmount(estimatedTotalPurchase)}`}
              meta="Overall supplier-side purchase value"
              tone="indigo"
            />
            <SnapshotCard
              label={translate(language, balance.isAdvance ? "advanceBalance" : "outstandingDue")}
              value={`Tk ${formatAmount(balance.absoluteAmount)}`}
              meta={balance.isAdvance ? "Advance already paid to this supplier" : "Current amount still payable"}
              tone={balance.isAdvance ? "emerald" : "rose"}
            />
            <SnapshotCard
              label="Total paid"
              value={`Tk ${formatAmount(totalPaid)}`}
              meta="All payments recorded against this supplier"
              tone="emerald"
            />
            <SnapshotCard
              label="Salt moved"
              value={`${formatAmount(totalSaltMoved)} MAUND`}
              meta="Cumulative purchase volume recorded"
              tone="amber"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ledger timeline</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Supplier activity timeline</h2>
            <p className="mt-2 text-sm text-slate-500">Newest supplier entries stay on top with running balance visibility.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              {filteredRecords.length} {translate(language, "entries")}
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              Purchase Tk {formatAmount(filteredEstimatedPurchase)}
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              Paid Tk {formatAmount(filteredTotalPaid)}
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
          <div className="w-full overflow-x-auto">
            <table className="min-w-[46rem] w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-sm font-medium">Date</th>
                  <th className="px-4 py-4 text-sm font-medium">Type</th>
                  <th className="px-4 py-4 text-sm font-medium">Salt (MAUND)</th>
                  <th className="px-4 py-4 text-sm font-medium">Paid amount</th>
                  <th className="px-4 py-4 text-sm font-medium">{translate(language, "dueOrAdvance")}</th>
                  <th className="px-4 py-4 text-sm font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                <LoadMoreTable
                  rows={recordRows}
                  colSpan={6}
                  loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
                  emptyState={
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                        No records found for this supplier.
                      </td>
                    </tr>
                  }
                />

                <tr className="border-t border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-800">
                  <td className="px-4 py-4 text-sm">Totals</td>
                  <td className="px-4 py-4 text-sm">-</td>
                  <td className="px-4 py-4 text-sm">
                    <div className="text-sm">{formatAmount(filteredTotalSaltMoved)}</div>
                    <div className="text-sm font-medium text-slate-500">
                      {filteredAveragePurchasePerMaund > 0 ? `Per maund Tk ${formatAmount(filteredAveragePurchasePerMaund)}` : "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">Tk {formatAmount(filteredTotalPaid)}</td>
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

