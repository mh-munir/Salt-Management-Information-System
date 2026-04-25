import CustomersPageClient from "@/app/(dashboard)/customers/CustomersPageClient";
import { getCustomersPageData } from "@/lib/customers-data";

export default async function CustomersPage() {
  const initialData = await getCustomersPageData();

  return <CustomersPageClient initialData={initialData} />;
}
