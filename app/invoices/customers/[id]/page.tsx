import { notFound } from "next/navigation";
import InvoiceActions from "@/components/InvoiceActions";
import CustomerInvoiceTable from "@/components/CustomerInvoiceTable";
import PlainImage from "@/components/PlainImage";
import { getServerAuthOrRedirect } from "@/lib/auth.server";
import { getBalanceSummary } from "@/lib/balance";
import { formatDisplayName } from "@/lib/display-format";
import { getCustomerInvoiceData, getInvoiceBranding } from "@/lib/invoices";

interface CustomerInvoicePageProps {
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

const formatKg = (value: number) =>
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

export default async function CustomerInvoicePage({ params }: CustomerInvoicePageProps) {
  await getServerAuthOrRedirect();
  const { id } = await params;
  const [invoice, branding] = await Promise.all([getCustomerInvoiceData(id), getInvoiceBranding()]);

  if (!invoice) notFound();

  const statementPeriod = getStatementPeriod(invoice.records.map((record) => record.date));
  const balance = getBalanceSummary(invoice.totalDueAmount);

  return (
    <div className="invoice-page min-h-screen bg-white dark:bg-slate-950 px-2 py-1 md:px-3">
      <InvoiceActions backHref={`/customers/${id}`} />

      <section className="invoice-sheet mx-auto max-w-4xl overflow-hidden bg-white shadow-sm" style={{ height: "fit-content" }}>
        {/* Header */}
        <div className="border-b-4 border-green-600 px-6 py-6">
          <div className="flex items-start justify-between">
            {/* Left side: Logo + Company name */}
            <div className="flex items-start gap-3">
              {branding.logoUrl ? (
                <div className="h-12 w-12 overflow-hidden rounded border border-gray-300 bg-white">
                  <PlainImage
                    src={branding.logoUrl}
                    alt={`${branding.heading} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded border border-green-600 bg-green-50 font-bold text-green-600">
                  {branding.heading?.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-gray-900">{branding.heading}</p>
                <p className="text-xs text-gray-600">{branding.subheading}</p>
              </div>
            </div>

            {/* Right side: INVOICE title */}
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div className="px-6 py-6 grid grid-cols-2 gap-8 border-b border-gray-200">
          <div>
            <p className="text-xs font-bold text-gray-700 mb-3">INVOICE TO:</p>
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-semibold">{formatDisplayName(invoice.name, "Customer")}</p>
              <p>📍 {invoice.address}</p>
              <p>☎️ {invoice.phone}</p>
            </div>
          </div>
          <div className="text-right space-y-2 text-sm">
            <div className="flex items-center gap-2 justify-end">
              <p className="text-gray-600">Invoice Number</p>
              <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <p className="text-gray-600">Invoice Date</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.generatedAt)}</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <p className="text-gray-600">Period</p>
              <p className="font-semibold text-gray-900">{statementPeriod}</p>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="px-6 py-6">
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">ITEM DESCRIPTION</th>
                  <th className="px-4 py-3 text-right font-semibold">UNIT PRICE</th>
                  <th className="px-4 py-3 text-right font-semibold">QUANTITY</th>
                  <th className="px-4 py-3 text-right font-semibold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <CustomerInvoiceTable records={invoice.records} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            {/* Left: Sale Information */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-3">SALE INFORMATION</p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Record Count</span>
                  <span className="font-semibold">{invoice.records.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Kg</span>
                  <span className="font-semibold">{formatKg(invoice.totalSaltKg)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Collection</span>
                  <span className="font-semibold">Tk {formatMoney(invoice.paidWithSalesAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Later Payment</span>
                  <span className="font-semibold">Tk {formatMoney(invoice.paidWithPaymentsAmount)}</span>
                </div>
              </div>
            </div>

            {/* Right: Totals */}
            <div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Sub Total</span>
                  <span className="font-semibold text-gray-900">Tk {formatMoney(invoice.totalSalesAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Received</span>
                  <span className="font-semibold text-gray-900">Tk {formatMoney(invoice.totalReceivedAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2">
                  <span className="font-semibold text-gray-900">TAX RATE</span>
                  <span className="font-semibold text-gray-900">0%</span>
                </div>
                {balance.isDue && (
                  <div className="flex justify-between bg-red-600 text-white px-3 py-2 rounded font-semibold">
                    <span>DUE AMOUNT</span>
                    <span>Tk {formatMoney(balance.dueAmount)}</span>
                  </div>
                )}
                {balance.isAdvance && (
                  <div className="flex justify-between bg-[#348CD4] text-white px-3 py-2 rounded font-semibold">
                    <span>ADVANCE AMOUNT</span>
                    <span>Tk {formatMoney(balance.advanceAmount)}</span>
                  </div>
                )}
                {balance.isSettled && (
                  <div className="flex justify-between bg-green-600 text-white px-3 py-2 rounded font-semibold">
                    <span>SETTLED</span>
                    <span>Tk 0.00</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="px-6 py-6 border-b border-gray-200">
          <p className="text-center text-xs text-gray-600 mb-6">Thank you for business!</p>
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-gray-300 pt-2 text-xs text-gray-700">Customer Signature</div>
            </div>
            <div>
              <div className="border-t border-gray-300 pt-2 text-xs text-gray-700">Authorized Signature</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-1 bg-gradient-to-r from-green-600 via-green-700 to-green-600"></div>
      </section>
    </div>
  );
}
