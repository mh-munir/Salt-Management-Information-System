import { notFound } from "next/navigation";
import InvoiceActions from "@/components/InvoiceActions";
import LoadMoreTable from "@/components/LoadMoreTable";
import PlainImage from "@/components/PlainImage";
import { getBalanceSummary } from "@/lib/balance";
import { formatDisplayName } from "@/lib/display-format";
import { getInvoiceBranding, getSupplierInvoiceData } from "@/lib/invoices";

interface SupplierInvoicePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const formatDate = (value?: Date) => {
  if (!value) return "-";
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value: number) =>
  value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatQuantity = (value: number) =>
  value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getStatementPeriod = (dates: Array<Date | undefined>) => {
  const availableDates = dates.filter((value): value is Date => value instanceof Date);

  if (availableDates.length === 0) return "No dated records";

  const sortedDates = [...availableDates].sort((left, right) => left.getTime() - right.getTime());
  const start = formatDate(sortedDates[0]);
  const end = formatDate(sortedDates[sortedDates.length - 1]);

  return start === end ? start : `${start} - ${end}`;
};

export default async function SupplierInvoicePage({ params }: SupplierInvoicePageProps) {
  const { id } = await params;
  const [invoice, branding] = await Promise.all([getSupplierInvoiceData(id), getInvoiceBranding()]);

  if (!invoice) notFound();

  const statementPeriod = getStatementPeriod(invoice.records.map((record) => record.date));
  const balance = getBalanceSummary(invoice.totalDueAmount);

  return (
    <div className="invoice-page min-h-screen bg-white dark:bg-slate-950 px-4 py-6 md:px-6">
      <InvoiceActions backHref={`/suppliers/${id}`} />

      <section className="invoice-sheet mx-auto max-w-5xl overflow-hidden rounded-md bg-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.55)]">
        <div className="relative overflow-hidden bg-[#20242b] px-6 pb-16 pt-6 text-white md:px-10 md:pb-20 md:pt-8">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              {branding.logoUrl ? (
                <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-white/95 shadow-sm">
                  <PlainImage
                    src={branding.logoUrl}
                    alt={`${branding.heading} logo`}
                    className="h-full w-full object-contain p-2"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-400 text-sm font-bold tracking-[0.2em] text-slate-950">
                  BM
                </div>
              )}

              <div>
                <p className="text-lg font-semibold uppercase tracking-[0.14em] text-white">{branding.heading}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{branding.subheading}</p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs uppercase tracking-[0.34em] text-slate-300">Supplier Statement</p>
              <h1 className="mt-2 text-3xl font-light uppercase tracking-[0.18em] text-white md:text-4xl">Invoice</h1>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="block h-14 w-full md:h-16">
              <path
                d="M0,48 C180,122 360,0 540,56 C720,112 900,20 1080,58 C1140,72 1175,76 1200,72 L1200,120 L0,120 Z"
                className="fill-sky-500"
              />
            </svg>
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="-mt-9 block h-12 w-full md:-mt-10 md:h-14">
              <path
                d="M0,56 C160,0 340,112 520,62 C700,14 900,104 1080,62 C1140,48 1175,46 1200,48 L1200,120 L0,120 Z"
                className="fill-sky-300"
              />
            </svg>
          </div>
        </div>

        <div className="px-6 py-8 md:px-10">
          <div className="grid gap-8 border-b border-slate-200 pb-8 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Invoice To</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">{formatDisplayName(invoice.name, "Supplier")}</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Phone</span>
                  <span className="mx-2 text-slate-300">:</span>
                  {invoice.phone}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Address</span>
                  <span className="mx-2 text-slate-300">:</span>
                  {invoice.address}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Period</span>
                  <span className="mx-2 text-slate-300">:</span>
                  {statementPeriod}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-600 md:justify-self-end md:text-right">
              <p>
                <span className="font-semibold text-slate-800">Invoice No</span>
                <span className="mx-2 text-slate-300">:</span>
                {invoice.invoiceNumber}
              </p>
              <p>
                <span className="font-semibold text-slate-800">{balance.isAdvance ? "Advance Balance" : "Total Due"}</span>
                <span className="mx-2 text-slate-300">:</span>
                Tk {formatMoney(balance.absoluteAmount)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Invoice Date</span>
                <span className="mx-2 text-slate-300">:</span>
                {formatDate(invoice.generatedAt)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Supplier ID</span>
                <span className="mx-2 text-slate-300">:</span>
                {invoice.id}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto rounded-sm border border-slate-200">
            <table className="min-w-[48rem] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
                <tr>
                  <th className="bg-sky-500 px-5 py-3">Entry Description</th>
                  <th className="bg-slate-700 px-5 py-3 text-right">Purchase</th>
                  <th className="bg-slate-700 px-5 py-3 text-right">Paid</th>
                  <th className="bg-slate-700 px-5 py-3 text-right">Due / Advance</th>
                </tr>
              </thead>
              <tbody>
                <LoadMoreTable
                  items={invoice.records}
                  colSpan={4}
                  loadMoreLabel="Show more"
                  emptyState={
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        No invoice records available for this supplier.
                      </td>
                    </tr>
                  }
                  renderRows={(visibleRecords) =>
                    visibleRecords.map((record, index) => (
                      <tr key={record.id} className={index % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                        <td className="px-5 py-4 align-top">
                          <p className="font-semibold text-slate-800">{record.label}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {[
                              formatDate(record.date),
                              record.quantityMaund > 0 ? `${formatQuantity(record.quantityMaund)} maund` : "",
                              record.pricePerMaund > 0 ? `Per maund Tk ${formatMoney(record.pricePerMaund)}` : "",
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{record.note}</p>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {record.totalAmount > 0 ? `Tk ${formatMoney(record.totalAmount)}` : "--"}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {record.paidAmount > 0 ? `Tk ${formatMoney(record.paidAmount)}` : "--"}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {record.dueAmount !== 0 ? `Tk ${formatMoney(record.dueAmount)}` : "--"}
                        </td>
                      </tr>
                    ))
                  }
                />
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Statement Info</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Record Count</span>
                  <span className="mx-2 text-slate-300">:</span>
                  {invoice.records.length}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="mx-2 text-slate-300">:</span>
                  {formatQuantity(invoice.totalSaltMaund)} maund
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Purchase Value</span>
                  <span className="mx-2 text-slate-300">:</span>
                  Tk {formatMoney(invoice.totalPurchaseAmount)}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Paid Amount</span>
                  <span className="mx-2 text-slate-300">:</span>
                  Tk {formatMoney(invoice.totalPaidAmount)}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-sm border border-slate-200">
              <div className="grid grid-cols-[1fr_auto] bg-white text-sm">
                <p className="border-b border-slate-200 px-5 py-3 text-slate-600">Sub Total</p>
                <p className="border-b border-slate-200 px-5 py-3 text-right font-medium text-slate-800">
                  Tk {formatMoney(invoice.totalPurchaseAmount)}
                </p>
                <p className="border-b border-slate-200 px-5 py-3 text-slate-600">Paid Amount</p>
                <p className="border-b border-slate-200 px-5 py-3 text-right font-medium text-slate-800">
                  Tk {formatMoney(invoice.totalPaidAmount)}
                </p>
                <p className="border-b border-slate-200 px-5 py-3 text-slate-600">VAT</p>
                <p className="border-b border-slate-200 px-5 py-3 text-right font-medium text-slate-800">0.00</p>
                <p className="bg-sky-500 px-5 py-3 font-semibold uppercase tracking-[0.16em] text-white">
                  {balance.isAdvance ? "Advance Balance" : "Grand Total"}
                </p>
                <p className="bg-sky-500 px-5 py-3 text-right font-semibold text-white">
                  Tk {formatMoney(balance.absoluteAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#20242b] px-6 pb-6 pt-14 text-white md:px-10">
          <div className="pointer-events-none absolute inset-x-0 top-0">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="block h-14 w-full md:h-16">
              <path
                d="M0,0 L1200,0 L1200,48 C1030,108 855,12 680,60 C505,108 330,12 155,58 C95,72 45,78 0,74 Z"
                className="fill-sky-500"
              />
            </svg>
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="-mt-9 block h-12 w-full md:-mt-10 md:h-14">
              <path
                d="M0,0 L1200,0 L1200,42 C1080,14 930,106 750,58 C570,10 380,112 200,58 C120,34 55,28 0,34 Z"
                className="fill-sky-300"
              />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold">Thanks For Your Partnership!</p>
              <p className="mt-2 max-w-md text-xs uppercase tracking-[0.16em] text-slate-300">
                Terms: Ledger totals are based on recorded supplier purchases and payment entries only, including carried advance balances.
              </p>
            </div>

            <div className="w-full max-w-full rounded-sm bg-white px-4 py-3 text-right text-slate-700 sm:max-w-45">
              <div className="border-b border-slate-300 pb-3 text-sm font-medium">Signature</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
