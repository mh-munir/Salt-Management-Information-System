"use client";

import { formatLocalizedNumber } from "@/lib/display-format";
import { translate, type Language } from "@/lib/language";
import LoadMoreTable from "./LoadMoreTable";

interface InvoiceRecord {
  id: string;
  label: string;
  date?: Date;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  note: string;
}

interface CustomerInvoiceTableProps {
  records: InvoiceRecord[];
  language: Language;
}

const formatMoney = (value: number, language: Language) =>
  formatLocalizedNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatQuantity = (value: number, language: Language) =>
  formatLocalizedNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CustomerInvoiceTable({
  records,
  language,
}: CustomerInvoiceTableProps) {
  const rows = records.map((record, index) => (
    <tr key={record.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
      <td className="px-4 py-3 text-sm text-gray-700">{formatLocalizedNumber(index + 1, language, { maximumFractionDigits: 0 })}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        <p className="font-medium text-gray-800">{record.label}</p>
        <p className="mt-1 text-xs text-gray-500">{record.note}</p>
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
        {record.pricePerKg > 0 ? `Tk ${formatMoney(record.pricePerKg, language)}` : "-"}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
        {record.quantityKg > 0 ? `${formatQuantity(record.quantityKg, language)} ${translate(language, "kgUnit")}` : "-"}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
        {record.totalAmount > 0 ? `Tk ${formatMoney(record.totalAmount, language)}` : "-"}
      </td>
    </tr>
  ));

  return (
    <LoadMoreTable
      rows={rows}
      colSpan={5}
      loadMoreLabel={translate(language, "showMore")}
      emptyState={
        <tr>
          <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
            {translate(language, "noCustomerRecordsFound")}
          </td>
        </tr>
      }
    />
  );
}
