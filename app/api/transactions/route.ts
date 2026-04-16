import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { compareByLatestInput } from "@/lib/record-order";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();
    const [transactions, sales] = await Promise.all([
      Transaction.find().lean(),
      Sale.find().lean(),
    ]);

    const normalizedTransactions = transactions.map((record) => ({
      _id: String(record._id),
      amount: Number(record.amount ?? 0),
      totalAmount: Number(record.totalAmount ?? 0),
      saltAmount: Number(record.saltAmount ?? 0),
      date: record.date,
      type: record.type,
      supplierId: record.supplierId ? String(record.supplierId) : undefined,
      customerId: record.customerId ? String(record.customerId) : undefined,
    }));

    const normalizedSales = sales.map((sale) => ({
      _id: String(sale._id),
      amount: Number(sale.total ?? 0),
      totalAmount: Number(sale.total ?? 0),
      saltAmount: Number(sale.saltAmount ?? 0),
      date: sale.createdAt,
      type: "sale",
      customerId: sale.customerId ? String(sale.customerId) : undefined,
      supplierId: undefined,
    }));

    const data = [...normalizedTransactions, ...normalizedSales].sort((left, right) =>
      compareByLatestInput(
        { id: left._id, date: left.date },
        { id: right._id, date: right.date }
      )
    );

    return Response.json(data);
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Transactions unavailable, returning empty list.");
      return Response.json([]);
    }

    throw error;
  }
}
