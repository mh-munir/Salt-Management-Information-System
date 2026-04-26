"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompactDateInput from "@/components/CompactDateInput";
import { translate, type Language } from "@/lib/language";

type TableDateFilterToolbarProps = {
  language: Language;
  value: string;
  queryKey?: string;
  max?: string;
  printLabel?: string;
  printHref?: string;
};

export default function TableDateFilterToolbar({
  language,
  value,
  queryKey = "date",
  max,
  printLabel,
  printHref,
}: TableDateFilterToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextValue) {
      params.set(queryKey, nextValue);
    } else {
      params.delete(queryKey);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handlePrint = () => {
    if (!printHref) {
      window.print();
      return;
    }

    window.open(printHref, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="print-hidden flex flex-wrap items-end gap-2">
      <div className="min-w-[15rem]">
        <CompactDateInput
          name={`${queryKey}Filter`}
          label={translate(language, "dateLabel")}
          value={value}
          onChange={updateFilter}
          max={max}
          inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
        />
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => updateFilter("")}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {translate(language, "cancel")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center justify-center rounded-lg bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
      >
        {printLabel ?? translate(language, "print")}
      </button>
    </div>
  );
}
