import CustomersClient from "@/app/(dashboard)/customers/CustomersClient";
import { getCustomersPageData } from "@/lib/customers-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function CustomersPage() {
  const initialData = await getCustomersPageData();

  return <CustomersClient initialData={initialData} />;
}
