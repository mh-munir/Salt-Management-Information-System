import SuppliersPageClient from "@/app/(dashboard)/suppliers/SuppliersPageClient";
import { getSuppliersPageData } from "@/lib/suppliers-data";

export default async function SuppliersPage() {
  const initialData = await getSuppliersPageData();

  return <SuppliersPageClient initialData={initialData} />;
}
