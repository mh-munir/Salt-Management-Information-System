import { NextResponse } from 'next/server';
import { requireAuth } from "@/lib/auth";
import { connectDB, isMongoConnectionError } from '@/lib/db';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import Transaction from '@/models/Transaction';
import { sumSaleQuantity, toNumber } from "@/lib/live-ledgers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();

    const [customers, sales, supplierTransactions] = await Promise.all([
      Customer.find().lean(),
      Sale.find().lean(),
      Transaction.find({ supplierId: { $ne: null } }).lean(),
    ]);

    const calculatedBought = supplierTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.saltAmount),
      0
    );
    const calculatedSold = sales.reduce((sum, sale) => sum + sumSaleQuantity(sale), 0);
    const fallbackSold = customers.reduce((sum, customer) => sum + toNumber(customer.saltAmount), 0);

    const KG_PER_MOUND = 40;

    const totalBought = calculatedBought;
    const totalSoldKg = Math.max(calculatedSold, fallbackSold);
    const totalSoldMaund = totalSoldKg / KG_PER_MOUND;

    const stockMounds = totalBought - totalSoldMaund;
    const stockKg = Math.max(0, stockMounds) * KG_PER_MOUND;

    return NextResponse.json({
      stockKg,
      stockMounds: Math.max(0, stockMounds), // Ensure non-negative
      totalBought,
      totalSoldKg,
      totalSoldMaund,
      totalPurchaseStock: totalBought,
      totalSaleStock: totalSoldKg,
      totalSaleStockMaund: totalSoldMaund,
      conversionKgPerMound: KG_PER_MOUND,
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Stock unavailable, returning empty totals.");
      return NextResponse.json({
        stockKg: 0,
        stockMounds: 0,
        totalBought: 0,
        totalSoldKg: 0,
        totalSoldMaund: 0,
        totalPurchaseStock: 0,
        totalSaleStock: 0,
        totalSaleStockMaund: 0,
        conversionKgPerMound: 40,
      });
    }

    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
