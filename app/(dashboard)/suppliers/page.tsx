import SuppliersClient from "@/app/(dashboard)/suppliers/SuppliersClient";
import { getSuppliersPageData } from "@/lib/suppliers-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function SuppliersPage() {
  const initialData = await getSuppliersPageData();

  return <SuppliersClient initialData={initialData} />;
}
