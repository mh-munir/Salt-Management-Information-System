import { connectDB, isMongoConnectionError } from "@/lib/db";
import { sumSaleQuantity, toNumber } from "@/lib/live-ledgers";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

const KG_PER_MOUND = 40;

type StockCustomerDoc = {
  saltAmount?: number;
};

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

    const [customers, sales, supplierTransactions] = (await Promise.all([
      Customer.find().select("saltAmount").lean(),
      Sale.find().select("createdAt customerId saltAmount items").lean(),
      Transaction.find({ supplierId: { $ne: null } })
        .select("date supplierId saltAmount")
        .lean(),
    ])) as [StockCustomerDoc[], StockSaleDoc[], StockTransactionDoc[]];

    const totalBought = supplierTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.saltAmount),
      0
    );
    const calculatedSoldKg = sales.reduce((sum, sale) => sum + sumSaleQuantity(sale), 0);
    const fallbackSoldKg = customers.reduce((sum, customer) => sum + toNumber(customer.saltAmount), 0);
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
