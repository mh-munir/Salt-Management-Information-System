import TransactionsClient from "@/app/(dashboard)/transactions/TransactionsClient";
import { getTransactionsFeed } from "@/lib/transactions-data";

export default async function TransactionsPage() {
  // Request default initial window so Payment History paginates (10 rows)
  const initialData = await getTransactionsFeed({ page: 1, limit: 10 });

  return <TransactionsClient initialData={initialData} />;
}
