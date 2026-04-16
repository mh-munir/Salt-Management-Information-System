import TransactionsClient from "@/app/(dashboard)/transactions/TransactionsClient";
import { getTransactionsFeed } from "@/lib/transactions-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function TransactionsPage() {
  const initialData = await getTransactionsFeed();

  return <TransactionsClient initialData={initialData} />;
}
