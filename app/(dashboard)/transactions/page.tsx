import { Suspense } from "react";
import TransactionsClient from "@/app/(dashboard)/transactions/TransactionsClient";
import TransactionsPageSkeleton from "@/app/(dashboard)/transactions/TransactionsPageSkeleton";
import { getTransactionsFeed } from "@/lib/transactions-data";

async function TransactionsPageContent() {
  // Request default initial window so Payment History paginates (10 rows)
  const initialData = await getTransactionsFeed({ page: 1, limit: 10 });

  return <TransactionsClient initialData={initialData} />;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsPageSkeleton />}>
      <TransactionsPageContent />
    </Suspense>
  );
}
