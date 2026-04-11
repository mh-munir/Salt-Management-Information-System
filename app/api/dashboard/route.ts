import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [
      saleStats,
      todaySaleStats,
      todayBuyStats,
      transactionStats,
      supplierStats,
      customerStats,
      transactionCount,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$total", 0] } },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfToday,
              $lt: endOfToday,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$total", 0] } },
            saltAmount: { $sum: { $ifNull: ["$saltAmount", 0] } },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            type: "supplier-buy",
            date: {
              $gte: startOfToday,
              $lt: endOfToday,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$totalAmount", 0] } },
            saltAmount: { $sum: { $ifNull: ["$saltAmount", 0] } },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            type: "supplier-buy",
          },
        },
        {
          $group: {
            _id: null,
            totalBuy: { $sum: { $ifNull: ["$totalAmount", 0] } },
            totalSaltBuy: { $sum: { $ifNull: ["$saltAmount", 0] } },
          },
        },
      ]),
      Supplier.aggregate([
        {
          $group: {
            _id: null,
            totalDue: { $sum: { $ifNull: ["$totalDue", 0] } },
          },
        },
      ]),
      Customer.aggregate([
        {
          $group: {
            _id: null,
            totalDue: { $sum: { $ifNull: ["$totalDue", 0] } },
          },
        },
      ]),
      Transaction.countDocuments(),
    ]);

    const totalSaleAmount = saleStats[0]?.total ?? 0;
    const todaySaleAmount = todaySaleStats[0]?.total ?? 0;
    const todaySaleSaltAmount = todaySaleStats[0]?.saltAmount ?? 0;
    const todayBuyAmount = todayBuyStats[0]?.total ?? 0;
    const todayBuySaltAmount = todayBuyStats[0]?.saltAmount ?? 0;
    const supplierDueAmount = supplierStats[0]?.totalDue ?? 0;
    const customerDueAmount = customerStats[0]?.totalDue ?? 0;

    return Response.json({
      sales: totalSaleAmount,
      totalSales: totalSaleAmount,
      todaySales: todaySaleAmount,
      todaySalesSaltKg: todaySaleSaltAmount,
      todayBuy: todayBuyAmount,
      todayBuySaltMaund: todayBuySaltAmount,
      totalBuy: transactionStats[0]?.totalBuy ?? 0,
      totalSaltBuy: transactionStats[0]?.totalSaltBuy ?? 0,
      customerDue: customerDueAmount,
      supplierDue: supplierDueAmount,
      transactions: transactionCount,
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Dashboard metrics unavailable, returning empty totals.");
      return Response.json({
        sales: 0,
        totalSales: 0,
        todaySales: 0,
        todaySalesSaltKg: 0,
        todayBuy: 0,
        todayBuySaltMaund: 0,
        totalBuy: 0,
        totalSaltBuy: 0,
        customerDue: 0,
        supplierDue: 0,
        transactions: 0,
      });
    }

    throw error;
  }
}
