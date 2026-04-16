import DashboardClient from "@/app/(dashboard)/dashboard/DashboardClient";
import { getDashboardPageData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function DashboardPage() {
  const initialData = await getDashboardPageData();

  return <DashboardClient initialData={initialData} />;
}
