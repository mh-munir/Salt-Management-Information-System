import StockClient from "@/app/(dashboard)/stock/StockClient";
import { getStockPageData } from "@/lib/stock-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function StockPage() {
  const initialData = await getStockPageData();

  return <StockClient initialData={initialData} />;
}
