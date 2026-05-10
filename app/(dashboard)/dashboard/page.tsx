import { Suspense } from "react";
import DashboardClient from "@/app/(dashboard)/dashboard/DashboardClient";
import DashboardPageSkeleton from "@/app/(dashboard)/dashboard/DashboardPageSkeleton";
import { getDashboardPageData } from "@/lib/dashboard-data";

async function DashboardPageContent() {
  const initialData = await getDashboardPageData();

  return <DashboardClient initialData={initialData} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
