import TransactionsClient from "@/app/(dashboard)/transactions/TransactionsClient";
import { getTransactionsFeed } from "@/lib/transactions-data";

export default async function TransactionsPage() {
  const initialData = await getTransactionsFeed();

  return <TransactionsClient initialData={initialData} />;
}
