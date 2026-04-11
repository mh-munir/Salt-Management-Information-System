import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { translate } from "@/lib/language";
import { cookies } from "next/headers";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";
import { summarizeSupplierLedger } from "@/lib/live-ledgers";

interface SupplierPageProps {
  params: Promise<{ id: string }>;
}

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

export default async function SupplierDetailPage({ params }: SupplierPageProps) {
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

  const supplier = await Supplier.findById(id).lean();
  if (!supplier) notFound();

  const records = await Transaction.find({ supplierId: id }).sort({ date: -1, _id: -1 }).lean();
  const latestPaymentRecord = records.find((record) => record.type === "supplier-payment");
  const orderedRecords = latestPaymentRecord
    ? [
        latestPaymentRecord,
        ...records.filter(
          (record) => String(record._id) !== String(latestPaymentRecord._id)
        ),
      ]
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
  const profileImage = createProfileAvatar(String(supplier.name ?? "Supplier"), "supplier");

  // Calculate running due for each record
  let currentDue = totalDue;
  const reversedRecords = [...orderedRecords].reverse();
  const dues: number[] = [];
  for (const rec of reversedRecords) {
    if (rec.type === 'supplier-buy') {
      currentDue += Number(rec.amount ?? 0);
    } else if (rec.type === 'supplier-payment') {
      currentDue -= Number(rec.amount ?? 0);
    }
    dues.push(currentDue);
  }
  dues.reverse();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-14 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[30%_70%] xl:items-stretch">
          <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Image
                src={profileImage}
                alt={`${supplier.name || "Supplier"} profile`}
                width={72}
                height={72}
                className="size-18 rounded-2xl border border-white/70 object-cover shadow-sm"
              />

              <div className="min-w-0">
                <p className="inline-flex rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Supplier profile
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {formatDisplayName(String(supplier.name ?? ""), "Supplier")}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Supplier account details, payment activity, and salt movement history in one place.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Phone: {supplier.phone || "-"}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Address: {supplier.address || "-"}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/invoices/suppliers/${id}`}
                target="_blank"
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
              >
                {translate(language, "printInvoice")}
              </Link>
              <Link
                href={`/suppliers?paymentId=${id}`}
                className="inline-flex w-full items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-auto"
              >
                {translate(language, "paymentNow")}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total amount</p>
              <p className="mt-3 text-2xl font-semibold text-blue-600">Tk {formatAmount(estimatedTotalPurchase)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current due</p>
              <p className="mt-3 text-2xl font-semibold text-rose-600">Tk {formatAmount(totalDue)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total paid</p>
              <p className="mt-3 text-2xl font-semibold text-emerald-600">Tk {formatAmount(totalPaid)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {formatAmount(totalSaltMoved)} MAUND
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Supplier activity timeline</h2>
            <p className="text-sm text-slate-500">Latest payment stays pinned on top, followed by remaining entries.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {records.length} entries
          </div>
        </div>

        <div className="mt-5 w-full overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Salt (MAUND)</th>
                <th className="px-4 py-3">Paid amount</th>
                <th className="px-4 py-3">Remaining due</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {orderedRecords.length > 0 ? (
                orderedRecords.map((record, index) => {
                  const isPurchase = record.type === "supplier-buy";
                  const saltMaund = Number(record.saltAmount ?? 0);
                  const totalPurchaseAmount = Number(record.totalAmount ?? 0);
                  const perMaundPrice =
                    isPurchase && saltMaund > 0 && totalPurchaseAmount > 0
                      ? totalPurchaseAmount / saltMaund
                      : 0;
                  return (
                    <tr key={String(record._id ?? record.date?.toString())} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-4 text-base text-slate-800">{formatDate(record.date)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${
                            isPurchase ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isPurchase ? "Purchase" : "Payment"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-base text-slate-700">
                        <div>{formatAmount(saltMaund)}</div>
                        <div className="text-xs text-slate-500">
                          {isPurchase && perMaundPrice > 0 ? `Per maund Tk ${formatAmount(perMaundPrice)}` : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base text-slate-700">Tk {formatAmount(Number(record.amount ?? 0))}</td>
                      <td className={`px-4 py-4 text-base ${dues[index] > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        Tk {formatAmount(dues[index])}
                      </td>
                      <td className="px-4 py-4 text-base text-slate-500">
                        {isPurchase ? "Salt purchase entry" : "Supplier payment entry"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-base text-slate-500">
                    No records found for this supplier.
                  </td>
                </tr>
              )}

              <tr className="border-t border-slate-200 bg-slate-50/70 text-base font-semibold text-slate-800">
                <td className="px-4 py-4">Totals</td>
                <td className="px-4 py-4">-</td>
                <td className="px-4 py-4">
                  <div>{formatAmount(totalSaltMoved)}</div>
                  <div className="text-xs font-medium text-slate-500">
                    {totalSaltMoved > 0 ? `Per maund Tk ${formatAmount(estimatedTotalPurchase / totalSaltMoved)}` : "-"}
                  </div>
                </td>
                <td className="px-4 py-4">Tk {formatAmount(totalPaid)}</td>
                <td className="px-4 py-4">Tk {formatAmount(totalDue)}</td>
                <td className="px-4 py-4">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

