import TransactionsClient from "@/app/(dashboard)/transactions/TransactionsClient";
import { getTransactionsFeed } from "@/lib/transactions-data";

export default async function TransactionsPage() {
  const initialData = await getTransactionsFeed({ page: 1, limit: 50 });

  return <TransactionsClient initialData={initialData} />;
}
