"use client";

import dynamic from "next/dynamic";
import type { CustomerListItem } from "@/lib/customers-data";

const CustomersClient = dynamic(() => import("./CustomersClient"), {
  loading: () => (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      Loading customers workspace...
    </div>
  ),
});

type CustomersPageClientProps = {
  initialData: CustomerListItem[];
};

export default function CustomersPageClient({ initialData }: CustomersPageClientProps) {
  return <CustomersClient initialData={initialData} />;
}
