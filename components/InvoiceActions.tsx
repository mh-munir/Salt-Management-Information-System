"use client";

import Link from "next/link";
import { translate, type Language } from "@/lib/language";

type InvoiceActionsProps = {
  backHref: string;
  language: Language;
};

export default function InvoiceActions({ backHref, language }: InvoiceActionsProps) {
  return (
    <div className="print-hidden mx-auto mb-6 max-w-5xl">
      <div className="flex flex-col gap-4 rounded-md border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.4)] backdrop-blur md:flex-row md:items-center md:justify-between md:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            {translate(language, "invoiceWorkspace")}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {translate(language, "invoiceWorkspaceDescription")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Link
            href={backHref}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
          >
            {translate(language, "backToProfile")}
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#348CD4] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#2F7FC0] sm:w-auto"
          >
            {translate(language, "printInvoice")}
          </button>
        </div>
      </div>
    </div>
  );
}
