import { connectDB, isMongoConnectionError } from "@/lib/db";
import { toNumber } from "@/lib/live-ledgers";
import Cost from "@/models/Cost";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

const KG_PER_MAUND = 40;

type DashboardCustomerDoc = {
  _id: unknown;
  name?: string;
  phone?: string;
  totalDue?: number;
  saltAmount?: number;
};

type DashboardSupplierDoc = {
  _id: unknown;
  name?: string;
  phone?: string;
  totalDue?: number;
};

type DashboardSalesSummaryDoc = {
  totalSales?: number;
  todaySales?: number;
  todaySalesSaltKg?: number;
  totalSoldKg?: number;
};

type DashboardBuySummaryDoc = {
  totalBuy?: number;
  totalSaltBuy?: number;
  todayBuy?: number;
  todayBuySaltMaund?: number;
};

type DashboardCostsSummaryDoc = {
  totalCost?: number;
  todayCost?: number;
};

type DashboardCustomerSummaryDoc = {
  totalDue?: number;
  totalSaltKg?: number;
};

type DashboardSupplierSummaryDoc = {
  totalDue?: number;
};

export type DashboardPartyContact = {
  _id?: string;
  name?: string;
  phone?: string;
};

export type DashboardStockSnapshot = {
  stockMounds: number;
  stockKg: number;
  totalBought: number;
};

export type DashboardPageData = {
  totalSales: number;
  todaySales: number;
  todaySalesSaltKg: number;
  todayBuy: number;
  todayBuySaltMaund: number;
  todayCost: number;
  totalCost: number;
  totalBuy: number;
  totalSaltBuy: number;
  customerDue: number;
  supplierDue: number;
  stockData: DashboardStockSnapshot;
  customers: DashboardPartyContact[];
  suppliers: DashboardPartyContact[];
};

const emptyDashboardData: DashboardPageData = {
  totalSales: 0,
  todaySales: 0,
  todaySalesSaltKg: 0,
  todayBuy: 0,
  todayBuySaltMaund: 0,
  todayCost: 0,
  totalCost: 0,
  totalBuy: 0,
  totalSaltBuy: 0,
  customerDue: 0,
  supplierDue: 0,
  stockData: {
    stockMounds: 0,
    stockKg: 0,
    totalBought: 0,
  },
  customers: [],
  suppliers: [],
};

export async function getDashboardPageData(): Promise<DashboardPageData> {
  try {
    await connectDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const numericOrZero = (fieldPath: string) => ({ $toDouble: { $ifNull: [fieldPath, 0] } });
    const dateOrNull = (fieldPath: string) => ({
      $convert: {
        input: fieldPath,
        to: "date",
        onError: null,
        onNull: null,
      },
    });
    const saleQuantityExpr = {
      $cond: [
        { $gt: [{ $size: { $ifNull: ["$items", []] } }, 0] },
        {
          $sum: {
            $map: {
              input: { $ifNull: ["$items", []] },
              as: "item",
              in: { $toDouble: { $ifNull: ["$$item.quantity", 0] } },
            },
          },
        },
        numericOrZero("$saltAmount"),
      ],
    };

    const [customerSummaryRows, supplierSummaryRows, salesSummaryRows, buySummaryRows, costSummaryRows, customers, suppliers] =
      (await Promise.all([
        Customer.aggregate([
          {
            $group: {
              _id: null,
              totalDue: { $sum: numericOrZero("$totalDue") },
              totalSaltKg: { $sum: numericOrZero("$saltAmount") },
            },
          },
          { $project: { _id: 0, totalDue: 1, totalSaltKg: 1 } },
        ]),
        Supplier.aggregate([
          {
            $group: {
              _id: null,
              totalDue: { $sum: numericOrZero("$totalDue") },
            },
          },
          { $project: { _id: 0, totalDue: 1 } },
        ]),
        Sale.aggregate([
          {
            $project: {
              createdAt: 1,
              totalAmount: numericOrZero("$total"),
              quantityKg: saleQuantityExpr,
            },
          },
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$totalAmount" },
              todaySales: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ["$createdAt", todayStart] }, { $lt: ["$createdAt", tomorrowStart] }] },
                    "$totalAmount",
                    0,
                  ],
                },
              },
              todaySalesSaltKg: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ["$createdAt", todayStart] }, { $lt: ["$createdAt", tomorrowStart] }] },
                    "$quantityKg",
                    0,
                  ],
                },
              },
              totalSoldKg: { $sum: "$quantityKg" },
            },
          },
          { $project: { _id: 0, totalSales: 1, todaySales: 1, todaySalesSaltKg: 1, totalSoldKg: 1 } },
        ]),
        Transaction.aggregate([
          { $match: { type: { $in: ["buy", "supplier-buy"] } } },
          {
            $project: {
              date: 1,
              totalAmount: numericOrZero("$totalAmount"),
              saltAmount: numericOrZero("$saltAmount"),
            },
          },
          {
            $group: {
              _id: null,
              totalBuy: { $sum: "$totalAmount" },
              totalSaltBuy: { $sum: "$saltAmount" },
              todayBuy: {
                $sum: {
                  $cond: [{ $and: [{ $gte: ["$date", todayStart] }, { $lt: ["$date", tomorrowStart] }] }, "$totalAmount", 0],
                },
              },
              todayBuySaltMaund: {
                $sum: {
                  $cond: [{ $and: [{ $gte: ["$date", todayStart] }, { $lt: ["$date", tomorrowStart] }] }, "$saltAmount", 0],
                },
              },
            },
          },
          { $project: { _id: 0, totalBuy: 1, totalSaltBuy: 1, todayBuy: 1, todayBuySaltMaund: 1 } },
        ]),
        Cost.aggregate([
          {
            $project: {
              amount: numericOrZero("$amount"),
              effectiveDate: {
                $ifNull: [dateOrNull("$date"), dateOrNull("$createdAt")],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalCost: { $sum: "$amount" },
              todayCost: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ["$effectiveDate", todayStart] }, { $lt: ["$effectiveDate", tomorrowStart] }] },
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
          { $project: { _id: 0, totalCost: 1, todayCost: 1 } },
        ]),
        Customer.find().select("_id name phone").lean(),
        Supplier.find().select("_id name phone").lean(),
      ])) as [
        DashboardCustomerSummaryDoc[],
        DashboardSupplierSummaryDoc[],
        DashboardSalesSummaryDoc[],
        DashboardBuySummaryDoc[],
        DashboardCostsSummaryDoc[],
        DashboardCustomerDoc[],
        DashboardSupplierDoc[],
      ];

    const salesSummary = salesSummaryRows[0] ?? {};
    const buysSummary = buySummaryRows[0] ?? {};
    const costsSummary = costSummaryRows[0] ?? {};
    const customersSummary = customerSummaryRows[0] ?? {};
    const suppliersSummary = supplierSummaryRows[0] ?? {};

    const totalSales = toNumber(salesSummary.totalSales);
    const todaySales = toNumber(salesSummary.todaySales);
    const todaySalesSaltKg = toNumber(salesSummary.todaySalesSaltKg);
    const totalBuy = toNumber(buysSummary.totalBuy);
    const totalSaltBuy = toNumber(buysSummary.totalSaltBuy);
    const todayBuy = toNumber(buysSummary.todayBuy);
    const todayBuySaltMaund = toNumber(buysSummary.todayBuySaltMaund);
    const totalCost = toNumber(costsSummary.totalCost);
    const todayCost = toNumber(costsSummary.todayCost);
    const customerDue = toNumber(customersSummary.totalDue);
    const supplierDue = toNumber(suppliersSummary.totalDue);

    const calculatedSoldKg = toNumber(salesSummary.totalSoldKg);
    const fallbackSoldKg = toNumber(customersSummary.totalSaltKg);
    const totalSoldKg = Math.max(calculatedSoldKg, fallbackSoldKg);
    const stockMounds = totalSaltBuy - totalSoldKg / KG_PER_MAUND;
    const safeStockMounds = Math.max(0, stockMounds);

    return {
      totalSales,
      todaySales,
      todaySalesSaltKg,
      todayBuy,
      todayBuySaltMaund,
      todayCost,
      totalCost,
      totalBuy,
      totalSaltBuy,
      customerDue,
      supplierDue,
      stockData: {
        stockMounds: safeStockMounds,
        stockKg: safeStockMounds * KG_PER_MAUND,
        totalBought: totalSaltBuy,
      },
      customers: customers.map((customer) => ({
        _id: String(customer._id),
        name: customer.name ?? "",
        phone: customer.phone ?? "",
      })),
      suppliers: suppliers.map((supplier) => ({
        _id: String(supplier._id),
        name: supplier.name ?? "",
        phone: supplier.phone ?? "",
      })),
    };
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return emptyDashboardData;
    }

    throw error;
  }
}
