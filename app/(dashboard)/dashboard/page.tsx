import DashboardClient from "@/app/(dashboard)/dashboard/DashboardClient";
import { getDashboardPageData } from "@/lib/dashboard-data";

export default async function DashboardPage() {
  const initialData = await getDashboardPageData();

  return <DashboardClient initialData={initialData} />;
}
