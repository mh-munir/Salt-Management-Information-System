import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import InvoiceActions from "@/components/InvoiceActions";
import SupplierInvoiceTable from "@/components/SupplierInvoiceTable";
import PlainImage from "@/components/PlainImage";
import { getServerAuthOrRedirect } from "@/lib/auth.server";
import { getBalanceSummary } from "@/lib/balance";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { getInvoiceBranding, getSupplierInvoiceData } from "@/lib/invoices";
import { LANGUAGE_STORAGE_KEY, translate, type Language } from "@/lib/language";

interface SupplierInvoicePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const getStatementPeriod = (dates: Array<Date | undefined>, language: Language) => {
  const availableDates = dates.filter((value): value is Date => value instanceof Date);

  if (availableDates.length === 0) return translate(language, "noDatedRecords");

  const sortedDates = [...availableDates].sort((left, right) => left.getTime() - right.getTime());
  const start = formatLocalizedDate(sortedDates[0], language);
  const end = formatLocalizedDate(sortedDates[sortedDates.length - 1], language);

  return start === end ? start : `${start} - ${end}`;
};

export default async function SupplierInvoicePage({ params }: SupplierInvoicePageProps) {
  await getServerAuthOrRedirect();
  const cookieStore = await cookies();
  const language: Language = cookieStore.get(LANGUAGE_STORAGE_KEY)?.value === "bn" ? "bn" : "en";
  const formatDate = (value?: Date) => formatLocalizedDate(value, language);
  const formatMoney = (value: number) =>
    formatLocalizedNumber(value, language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const formatQuantity = (value: number) =>
    formatLocalizedNumber(value, language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const { id } = await params;
  const [invoice, branding] = await Promise.all([getSupplierInvoiceData(id, language), getInvoiceBranding()]);

  if (!invoice) notFound();

  const statementPeriod = getStatementPeriod(invoice.records.map((record) => record.date), language);
  const balance = getBalanceSummary(invoice.totalDueAmount);

  return (
    <div className="invoice-page min-h-screen bg-white px-2 py-2 dark:bg-slate-950 md:px-4">
      <InvoiceActions backHref={`/suppliers/${id}`} language={language} />

      <section className="invoice-sheet mx-auto max-w-4xl overflow-hidden bg-white shadow-sm">
        <div className="border-b-4 border-green-600 px-6 py-6">
          <div className="flex items-start justify-between">
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

            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900">{translate(language, "invoiceTitle").toUpperCase()}</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 border-b border-gray-200 px-6 py-6">
          <div>
            <p className="mb-3 text-xs font-bold text-gray-700">{translate(language, "invoiceTo").toUpperCase()}:</p>
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-semibold">
                {formatDisplayName(invoice.name, translate(language, "supplierInvoiceFallback"))}
              </p>
              <p>
                {translate(language, "addressLabel")}: {invoice.address}
              </p>
              <p>
                {translate(language, "phoneLabel")}: {invoice.phone}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-right text-sm">
            <div className="flex items-center justify-end gap-1">
              <p className="text-gray-600">{translate(language, "invoiceNumberLabel")}</p>
              <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div className="flex items-center justify-end gap-1">
              <p className="text-gray-600">{translate(language, "invoiceDateLabel")}</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.generatedAt)}</p>
            </div>
            <div className="flex items-center justify-end gap-1">
              <p className="text-gray-600">{translate(language, "periodLabel")}</p>
              <p className="font-semibold text-gray-900">{statementPeriod}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">{translate(language, "sku").toUpperCase()}</th>
                  <th className="px-4 py-3 font-semibold">{translate(language, "itemDescription").toUpperCase()}</th>
                  <th className="px-4 py-3 text-right font-semibold">{translate(language, "unitPrice").toUpperCase()}</th>
                  <th className="px-4 py-3 text-right font-semibold">{translate(language, "quantityLabel").toUpperCase()}</th>
                  <th className="px-4 py-3 text-right font-semibold">{translate(language, "totalLabel").toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                <SupplierInvoiceTable records={invoice.records} language={language} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-b border-gray-200 px-6 py-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="mb-3 text-xs font-bold text-gray-700">
                {translate(language, "purchaseInformation").toUpperCase()}
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>{translate(language, "recordCount")}</span>
                  <span className="font-semibold">
                    {formatLocalizedNumber(invoice.records.length, language, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{translate(language, "totalQuantityLabel")}</span>
                  <span className="font-semibold">
                    {formatQuantity(invoice.totalSaltMaund)} {translate(language, "maundUnit")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{translate(language, "purchaseValue")}</span>
                  <span className="font-semibold">Tk {formatMoney(invoice.totalPurchaseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate(language, "paidAmountShort")}</span>
                  <span className="font-semibold">Tk {formatMoney(invoice.totalPaidAmount)}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">{translate(language, "subTotalLabel")}</span>
                  <span className="font-semibold text-gray-900">Tk {formatMoney(invoice.totalPurchaseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">{translate(language, "paidAmountShort")}</span>
                  <span className="font-semibold text-gray-900">Tk {formatMoney(invoice.totalPaidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2">
                  <span className="font-semibold text-gray-900">{translate(language, "taxRate").toUpperCase()}</span>
                  <span className="font-semibold text-gray-900">0%</span>
                </div>
                {balance.isDue && (
                  <div className="flex justify-between rounded bg-red-600 px-3 py-2 font-semibold text-white">
                    <span>{translate(language, "dueAmountBadge").toUpperCase()}</span>
                    <span>Tk {formatMoney(balance.dueAmount)}</span>
                  </div>
                )}
                {balance.isAdvance && (
                  <div className="flex justify-between rounded bg-[#348CD4] px-3 py-2 font-semibold text-white">
                    <span>{translate(language, "advanceAmountBadge").toUpperCase()}</span>
                    <span>Tk {formatMoney(balance.advanceAmount)}</span>
                  </div>
                )}
                {balance.isSettled && (
                  <div className="flex justify-between rounded bg-green-600 px-3 py-2 font-semibold text-white">
                    <span>{translate(language, "settled").toUpperCase()}</span>
                    <span>Tk {formatMoney(0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 px-6 py-6">
          <p className="mb-6 text-center text-xs text-gray-600">{translate(language, "thankYouBusiness")}</p>
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-gray-300 pt-2 text-xs text-gray-700">
                {translate(language, "supplierSignature")}
              </div>
            </div>
            <div>
              <div className="border-t border-gray-300 pt-2 text-xs text-gray-700">
                {translate(language, "authorizedSignature")}
              </div>
            </div>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-green-600 via-green-700 to-green-600"></div>
      </section>
    </div>
  );
}
