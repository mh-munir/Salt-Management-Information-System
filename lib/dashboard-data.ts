import { connectDB, isMongoConnectionError } from "@/lib/db";
import { sumSaleQuantity, toNumber } from "@/lib/live-ledgers";
import { compareByLatestInput } from "@/lib/record-order";
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

type DashboardSaleItem = {
  quantity?: number;
};

type DashboardSaleDoc = {
  _id: unknown;
  total?: number;
  saltAmount?: number;
  items?: DashboardSaleItem[];
  createdAt?: string | Date;
  customerId?: unknown;
  paid?: number;
  due?: number;
};

type DashboardTransactionDoc = {
  _id: unknown;
  amount?: number;
  totalAmount?: number;
  saltAmount?: number;
  date?: string | Date;
  type?: string;
  customerId?: unknown;
  supplierId?: unknown;
};

type DashboardCostDoc = {
  amount?: number;
  date?: string | Date;
  createdAt?: string | Date;
};

export type DashboardTransactionItem = {
  _id: string;
  amount: number;
  saltAmount: number;
  date?: string | Date;
  type?: string;
  customerId?: string;
  supplierId?: string;
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
  rawTransactions: DashboardTransactionItem[];
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
  rawTransactions: [],
};

const toLocalIsoDate = (value?: string | Date | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export async function getDashboardPageData(): Promise<DashboardPageData> {
  try {
    await connectDB();

    const [customers, suppliers, sales, transactions, costs] = (await Promise.all([
      Customer.find().select("_id name phone totalDue saltAmount").lean(),
      Supplier.find().select("_id name phone totalDue").lean(),
      Sale.find().select("_id total saltAmount items createdAt customerId paid due").lean(),
      Transaction.find()
        .select("_id amount totalAmount saltAmount date type customerId supplierId")
        .lean(),
      Cost.find().select("_id amount date createdAt").lean(),
    ])) as [
      DashboardCustomerDoc[],
      DashboardSupplierDoc[],
      DashboardSaleDoc[],
      DashboardTransactionDoc[],
      DashboardCostDoc[],
    ];

    const todayString = toLocalIsoDate(new Date());
    let totalSales = 0;
    let todaySales = 0;
    let todaySalesSaltKg = 0;

    const normalizedSales: DashboardTransactionItem[] = sales.map((sale) => {
      const totalAmount = toNumber(sale.total);
      const quantity = sumSaleQuantity(sale);
      const saleDate = sale.createdAt;

      totalSales += totalAmount;
      if (toLocalIsoDate(saleDate) === todayString) {
        todaySales += totalAmount;
        todaySalesSaltKg += quantity;
      }

      return {
        _id: String(sale._id),
        amount: totalAmount,
        saltAmount: quantity,
        date: saleDate,
        type: "sale",
        customerId: sale.customerId ? String(sale.customerId) : undefined,
      };
    });

    let todayBuy = 0;
    let todayBuySaltMaund = 0;
    let totalBuy = 0;
    let totalSaltBuy = 0;
    const normalizedTransactions: DashboardTransactionItem[] = transactions.map((transaction) => {
      const amount = toNumber(transaction.amount);
      const totalAmount = toNumber(transaction.totalAmount);
      const saltAmount = toNumber(transaction.saltAmount);
      const transactionDate = transaction.date;

      if (transaction.type === "supplier-buy") {
        totalBuy += totalAmount;
        totalSaltBuy += saltAmount;

        if (toLocalIsoDate(transactionDate) === todayString) {
          todayBuy += totalAmount;
          todayBuySaltMaund += saltAmount;
        }
      }

      return {
        _id: String(transaction._id),
        amount,
        saltAmount,
        date: transactionDate,
        type: transaction.type,
        customerId: transaction.customerId ? String(transaction.customerId) : undefined,
        supplierId: transaction.supplierId ? String(transaction.supplierId) : undefined,
      };
    });

    const rawTransactions = [...normalizedTransactions, ...normalizedSales].sort((left, right) =>
      compareByLatestInput({ id: left._id, date: left.date }, { id: right._id, date: right.date })
    );

    const customerDue = customers.reduce((sum, customer) => sum + toNumber(customer.totalDue), 0);
    const supplierDue = suppliers.reduce((sum, supplier) => sum + toNumber(supplier.totalDue), 0);

    const calculatedSoldKg = sales.reduce((sum, sale) => sum + sumSaleQuantity(sale), 0);
    const fallbackSoldKg = customers.reduce((sum, customer) => sum + toNumber(customer.saltAmount), 0);
    const totalSoldKg = Math.max(calculatedSoldKg, fallbackSoldKg);
    const stockMounds = totalSaltBuy - totalSoldKg / KG_PER_MAUND;
    const safeStockMounds = Math.max(0, stockMounds);

    const totalCost = costs.reduce((sum, cost) => sum + toNumber(cost.amount), 0);
    const todayCost = costs.reduce((sum, cost) => {
      const costDate = toLocalIsoDate(cost.date ?? cost.createdAt);
      return costDate === todayString ? sum + toNumber(cost.amount) : sum;
    }, 0);

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
      rawTransactions,
    };
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return emptyDashboardData;
    }

    throw error;
  }
}
