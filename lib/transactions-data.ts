import { connectDB, isMongoConnectionError } from "@/lib/db";
import { compareByLatestInput } from "@/lib/record-order";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

type TransactionsPopulatedRef = {
  _id?: unknown;
  name?: string;
};

type TransactionsDoc = {
  _id: unknown;
  amount?: number;
  date?: string | Date;
  type?: string;
  supplierId?: unknown | TransactionsPopulatedRef;
  customerId?: unknown | TransactionsPopulatedRef;
};

type SaleDoc = {
  _id: unknown;
  total?: number;
  createdAt?: string | Date;
  customerId?: unknown | TransactionsPopulatedRef;
};

const getPopulatedId = (value: unknown): string | undefined => {
  if (!value) return undefined;

  if (typeof value === "object" && "_id" in value) {
    const nestedId = value._id;
    return nestedId ? String(nestedId) : undefined;
  }

  return String(value);
};

const getPopulatedName = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object" || !("name" in value)) {
    return undefined;
  }

  return typeof value.name === "string" ? value.name : undefined;
};

export type TransactionsFeedItem = {
  _id: string;
  amount?: number;
  date?: string | Date;
  type?: string;
  supplierId?: string;
  customerId?: string;
  supplierName?: string;
  customerName?: string;
};

export async function getTransactionsFeed(): Promise<TransactionsFeedItem[]> {
  try {
    await connectDB();

    const [transactions, sales] = (await Promise.all([
      Transaction.find()
        .populate("supplierId", "name")
        .populate("customerId", "name")
        .lean(),
      Sale.find().populate("customerId", "name").lean(),
    ])) as [TransactionsDoc[], SaleDoc[]];

    const normalizedTransactions = transactions.map((record) => ({
      _id: String(record._id),
      amount: Number(record.amount ?? 0),
      date: record.date,
      type: record.type,
      supplierId: getPopulatedId(record.supplierId),
      customerId: getPopulatedId(record.customerId),
      supplierName: getPopulatedName(record.supplierId),
      customerName: getPopulatedName(record.customerId),
    }));

    const normalizedSales = sales.map((sale) => ({
      _id: String(sale._id),
      amount: Number(sale.total ?? 0),
      date: sale.createdAt,
      type: "sale",
      customerId: getPopulatedId(sale.customerId),
      supplierId: undefined,
      customerName: getPopulatedName(sale.customerId),
    }));

    return [...normalizedTransactions, ...normalizedSales].sort((left, right) =>
      compareByLatestInput({ id: left._id, date: left.date }, { id: right._id, date: right.date })
    );
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return [];
    }

    throw error;
  }
}
