import { connectDB, isMongoConnectionError } from "@/lib/db";
import { sumSaleQuantity, toNumber } from "@/lib/live-ledgers";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

const KG_PER_MOUND = 40;
const STOCK_HISTORY_DAYS = 60;
const STOCK_HISTORY_RECORD_LIMIT = 2_000;

type StockSaleItem = {
  quantity?: number;
};

type StockSaleDoc = {
  createdAt?: string | Date;
  customerId?: unknown;
  saltAmount?: number;
  items?: StockSaleItem[];
};

type StockTransactionDoc = {
  date?: string | Date;
  supplierId?: unknown;
  saltAmount?: number;
};

export type StockTransactionItem = {
  date?: string | Date;
  supplierId?: string;
  customerId?: string;
  saltAmount?: number;
};

export type StockPageData = {
  stockKg: number;
  stockMounds: number;
  totalBought: number;
  totalSoldKg: number;
  totalSoldMaund: number;
  totalPurchaseStock: number;
  totalSaleStock: number;
  totalSaleStockMaund: number;
  conversionKgPerMound: number;
  transactions: StockTransactionItem[];
};

const emptyStockData: StockPageData = {
  stockKg: 0,
  stockMounds: 0,
  totalBought: 0,
  totalSoldKg: 0,
  totalSoldMaund: 0,
  totalPurchaseStock: 0,
  totalSaleStock: 0,
  totalSaleStockMaund: 0,
  conversionKgPerMound: KG_PER_MOUND,
  transactions: [],
};

export async function getStockPageData(): Promise<StockPageData> {
  try {
    await connectDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const historyStart = new Date(todayStart);
    historyStart.setDate(historyStart.getDate() - STOCK_HISTORY_DAYS);

    const numericOrZero = (fieldPath: string) => ({ $toDouble: { $ifNull: [fieldPath, 0] } });
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

    const [customerSummaryRows, salesSummaryRows, supplierSummaryRows, sales, supplierTransactions] = (await Promise.all([
      Customer.aggregate([
        {
          $group: {
            _id: null,
            totalSaltKg: { $sum: numericOrZero("$saltAmount") },
          },
        },
        { $project: { _id: 0, totalSaltKg: 1 } },
      ]),
      Sale.aggregate([
        {
          $project: {
            quantityKg: saleQuantityExpr,
          },
        },
        {
          $group: {
            _id: null,
            totalSoldKg: { $sum: "$quantityKg" },
          },
        },
        { $project: { _id: 0, totalSoldKg: 1 } },
      ]),
      Transaction.aggregate([
        { $match: { supplierId: { $ne: null } } },
        {
          $group: {
            _id: null,
            totalBought: { $sum: numericOrZero("$saltAmount") },
          },
        },
        { $project: { _id: 0, totalBought: 1 } },
      ]),
      Sale.find({ createdAt: { $gte: historyStart } })
        .select("createdAt customerId saltAmount items")
        .sort({ createdAt: -1 })
        .limit(STOCK_HISTORY_RECORD_LIMIT)
        .lean(),
      Transaction.find({ supplierId: { $ne: null }, date: { $gte: historyStart } })
        .select("date supplierId saltAmount")
        .sort({ date: -1 })
        .limit(STOCK_HISTORY_RECORD_LIMIT)
        .lean(),
    ])) as [
      Array<{ totalSaltKg?: number }>,
      Array<{ totalSoldKg?: number }>,
      Array<{ totalBought?: number }>,
      StockSaleDoc[],
      StockTransactionDoc[],
    ];

    const totalBought = toNumber(supplierSummaryRows[0]?.totalBought);
    const calculatedSoldKg = toNumber(salesSummaryRows[0]?.totalSoldKg);
    const fallbackSoldKg = toNumber(customerSummaryRows[0]?.totalSaltKg);
    const totalSoldKg = Math.max(calculatedSoldKg, fallbackSoldKg);
    const totalSoldMaund = totalSoldKg / KG_PER_MOUND;
    const stockMounds = Math.max(0, totalBought - totalSoldMaund);

    return {
      stockKg: stockMounds * KG_PER_MOUND,
      stockMounds,
      totalBought,
      totalSoldKg,
      totalSoldMaund,
      totalPurchaseStock: totalBought,
      totalSaleStock: totalSoldKg,
      totalSaleStockMaund: totalSoldMaund,
      conversionKgPerMound: KG_PER_MOUND,
      transactions: [
        ...supplierTransactions.map((transaction) => ({
          date: transaction.date,
          supplierId: transaction.supplierId ? String(transaction.supplierId) : undefined,
          saltAmount: toNumber(transaction.saltAmount),
        })),
        ...sales.map((sale) => ({
          date: sale.createdAt,
          customerId: sale.customerId ? String(sale.customerId) : undefined,
          saltAmount: sumSaleQuantity(sale),
        })),
      ],
    };
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return emptyStockData;
    }

    throw error;
  }
}
