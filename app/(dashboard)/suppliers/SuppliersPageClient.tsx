"use client";

import dynamic from "next/dynamic";
import type { SupplierListItem } from "@/lib/suppliers-data";

const SuppliersClient = dynamic(() => import("./SuppliersClient"), {
  loading: () => (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      Loading suppliers workspace...
    </div>
  ),
});

type SuppliersPageClientProps = {
  initialData: SupplierListItem[];
};

export default function SuppliersPageClient({ initialData }: SuppliersPageClientProps) {
  return <SuppliersClient initialData={initialData} />;
}
