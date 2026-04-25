import StockClient from "@/app/(dashboard)/stock/StockClient";
import { getStockPageData } from "@/lib/stock-data";

export default async function StockPage() {
  const initialData = await getStockPageData();

  return <StockClient initialData={initialData} />;
}
