import { connectDB, isMongoConnectionError } from "@/lib/db";
import { compareByLatestInput } from "@/lib/record-order";
import Cost from "@/models/Cost";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";
import type { PaginatedResponse, PaginationParams } from "@/lib/pagination";

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
  __sourceCollection?: string;
};

type TransactionsFeedOptions = PaginationParams;

export type TransactionsFeedPage = PaginatedResponse<TransactionsFeedItem>;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_FETCH_WINDOW = 500;

export async function getTransactionsFeed(
  options: Partial<TransactionsFeedOptions> = {}
): Promise<TransactionsFeedPage> {
  try {
    await connectDB();

    const page = Math.max(DEFAULT_PAGE, Number(options.page ?? DEFAULT_PAGE));
    const limit = Math.max(1, Number(options.limit ?? DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    // Get raw counts in parallel (used for total/hasMore)
    const [transactionCount, saleCount, costCount] = (await Promise.all([
      Transaction.countDocuments(),
      Sale.countDocuments(),
      Cost.countDocuments(),
    ])) as [number, number, number];

    const total = transactionCount + saleCount + costCount;

    // Use a single aggregation with $unionWith so MongoDB can sort/limit server-side
    // This avoids fetching large windows into application memory and merging in JS.
    const aggPipeline: any[] = [
      // Start with transactions projection
      {
        $project: {
          _id: "$_id",
          amount: "$amount",
          date: "$date",
          type: "$type",
          supplierId: "$supplierId",
          customerId: "$customerId",
          personName: { $literal: null },
          __sourceCollection: { $literal: "transaction" },
        },
      },
      // Union with sales
      {
        $unionWith: {
          coll: Sale.collection.name,
          pipeline: [
            {
              $project: {
                _id: "$_id",
                amount: "$total",
                date: "$createdAt",
                type: { $literal: "sale" },
                supplierId: { $literal: null },
                customerId: "$customerId",
                personName: { $literal: null },
                __sourceCollection: { $literal: "sale" },
              },
            },
          ],
        },
      },
      // Union with costs
      {
        $unionWith: {
          coll: Cost.collection.name,
          pipeline: [
            {
              $project: {
                _id: "$_id",
                amount: "$amount",
                date: { $ifNull: ["$date", "$createdAt"] },
                type: { $literal: "cost" },
                supplierId: { $literal: null },
                customerId: { $literal: null },
                personName: "$personName",
                __sourceCollection: { $literal: "cost" },
              },
            },
          ],
        },
      },
      // Lookup customer and supplier names where applicable
      {
        $lookup: {
          from: Customer.collection.name,
          localField: "customerId",
          foreignField: "_id",
          as: "__customer",
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "supplierId",
          foreignField: "_id",
          as: "__supplier",
        },
      },
      {
        $addFields: {
          __customer: { $arrayElemAt: ["$__customer", 0] },
          __supplier: { $arrayElemAt: ["$__supplier", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          amount: 1,
          date: 1,
          type: 1,
          supplierId: { $cond: [{ $ifNull: ["$__supplier._id", false] }, "$__supplier._id", "$supplierId"] },
          customerId: { $cond: [{ $ifNull: ["$__customer._id", false] }, "$__customer._id", "$customerId"] },
          supplierName: "$__supplier.name",
          customerName: "$__customer.name",
          personName: 1,
          __sourceCollection: 1,
        },
      },
      { $sort: { date: -1, _id: -1 } },
      { $skip: offset },
      { $limit: limit },
    ];

    const aggResults = (await Transaction.aggregate(aggPipeline).allowDiskUse(true).exec()) as Array<any>;

    const items: TransactionsFeedItem[] = aggResults.map((r) => ({
      _id: String(r._id),
      amount: Number(r.amount ?? 0),
      date: r.date,
      type: r.type,
      supplierId: r.supplierId ? String(r.supplierId) : undefined,
      customerId: r.customerId ? String(r.customerId) : undefined,
      supplierName: typeof r.supplierName === "string" ? r.supplierName : undefined,
      customerName: typeof r.customerName === "string" ? r.customerName : undefined,
      personName: typeof r.personName === "string" ? r.personName : undefined,
      __sourceCollection: r.__sourceCollection,
    }));

    return {
      items,
      page,
      limit,
      total,
      hasMore: offset + items.length < total,
    };
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return {
        items: [],
        page: Math.max(DEFAULT_PAGE, Number(options.page ?? DEFAULT_PAGE)),
        limit: Math.max(1, Number(options.limit ?? DEFAULT_LIMIT)),
        total: 0,
        hasMore: false,
      };
    }

    throw error;
  }
}
