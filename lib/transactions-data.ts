import { connectDB, isMongoConnectionError } from "@/lib/db";
import { compareByLatestInput } from "@/lib/record-order";
import Cost from "@/models/Cost";
import Customer from "@/models/Customer";
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

type CostDoc = {
  _id: unknown;
  amount?: number;
  date?: string | Date;
  createdAt?: string | Date;
  personName?: string;
};

type CustomerDoc = {
  _id: unknown;
  name?: string;
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
  personName?: string;
};

export async function getTransactionsFeed(): Promise<TransactionsFeedItem[]> {
  try {
    await connectDB();

    const [transactions, sales, costs] = (await Promise.all([
      Transaction.find()
        .select("_id amount date type supplierId customerId")
        .sort({ date: -1, _id: -1 })
        .populate("supplierId", "name")
        .populate("customerId", "name")
        .lean(),
      Sale.find()
        .select("_id total createdAt customerId")
        .sort({ createdAt: -1, _id: -1 })
        .lean(),
      Cost.find()
        .select("_id amount date createdAt personName")
        .sort({ date: -1, createdAt: -1, _id: -1 })
        .lean(),
    ])) as [TransactionsDoc[], SaleDoc[], CostDoc[]];

    const customerIds = Array.from(
      new Set(
        [
          ...transactions.map((record) => getPopulatedId(record.customerId)).filter(Boolean),
          ...sales.map((sale) => getPopulatedId(sale.customerId)).filter(Boolean),
        ].map((id) => String(id))
      )
    );

    const customers = (customerIds.length > 0
      ? await Customer.find({ _id: { $in: customerIds } }).select("_id name").lean()
      : []) as CustomerDoc[];

    const customerNameById = new Map(
      customers.map((customer) => [String(customer._id), typeof customer.name === "string" ? customer.name.trim() : ""])
    );

    const normalizedTransactions = transactions.map((record) => ({
      _id: String(record._id),
      amount: Number(record.amount ?? 0),
      date: record.date,
      type: record.type,
      supplierId: getPopulatedId(record.supplierId),
      customerId: getPopulatedId(record.customerId),
      supplierName: getPopulatedName(record.supplierId),
      customerName:
        getPopulatedName(record.customerId) ??
        (getPopulatedId(record.customerId) ? customerNameById.get(String(getPopulatedId(record.customerId))) : undefined),
    }));

    const normalizedSales = sales.map((sale) => ({
      _id: String(sale._id),
      amount: Number(sale.total ?? 0),
      date: sale.createdAt,
      type: "sale",
      customerId: getPopulatedId(sale.customerId),
      supplierId: undefined,
      customerName:
        getPopulatedName(sale.customerId) ??
        (getPopulatedId(sale.customerId) ? customerNameById.get(String(getPopulatedId(sale.customerId))) : undefined),
    }));

    const normalizedCosts = costs.map((cost) => ({
      _id: String(cost._id),
      amount: Number(cost.amount ?? 0),
      date: cost.date ?? cost.createdAt,
      type: "cost",
      supplierId: undefined,
      customerId: undefined,
      personName: typeof cost.personName === "string" ? cost.personName.trim() : "",
    }));

    return [...normalizedTransactions, ...normalizedSales, ...normalizedCosts].sort((left, right) =>
      compareByLatestInput({ id: left._id, date: left.date }, { id: right._id, date: right.date })
    );
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return [];
    }

    throw error;
  }
}
