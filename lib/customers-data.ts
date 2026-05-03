import { connectDB, isMongoConnectionError } from "@/lib/db";
import { summarizeCustomerLedger } from "@/lib/live-ledgers";
import { compareByLatestInput, getInputTimestamp } from "@/lib/record-order";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";
import { cache } from "react";

type CustomerDoc = {
  _id: unknown;
  name?: string;
  phone?: string;
  address?: string;
  totalDue?: number;
  saltAmount?: number;
  totalPaid?: number;
};

type SaleDoc = {
  _id: unknown;
  customerId?: unknown;
  saltAmount?: unknown;
  numberOfBags?: unknown;
  bagType?: unknown;
  items?: Array<{ quantity?: unknown }>;
  total?: unknown;
  paid?: unknown;
  hockExtendedSack?: unknown;
  trackExpenses?: unknown;
  createdAt?: string | Date;
  editedByName?: unknown;
  editedByRole?: unknown;
  editedAt?: string | Date | null;
};

type PaymentDoc = {
  _id: unknown;
  customerId?: unknown;
  amount?: unknown;
  date?: string | Date;
};

export type CustomerListItem = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  totalSalesAmount?: number;
  totalHockExtendedSack?: number;
  totalTrackExpenses?: number;
  totalDue?: number;
  saltAmount?: number;
  totalPaid?: number;
  lastActivityAt?: number;
  latestSaleId?: string | null;
  latestSaleSaltAmount?: number;
  latestSaleDate?: string | null;
  latestPricePerKg?: number;
  latestNumberOfBags?: number;
  latestBagType?: string;
  editedByName?: string;
  editedByRole?: string;
  editedAt?: string | null;
};

const resolveSaleQuantity = (sale: { items?: Array<{ quantity?: unknown }>; saltAmount?: unknown }) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.reduce((sum, item) => sum + Number(item?.quantity ?? 0), 0);
  }

  return Number(sale.saltAmount ?? 0);
};

const resolveSaleAdjustments = (sale?: { hockExtendedSack?: unknown; trackExpenses?: unknown } | null) => ({
  hockExtendedSack: Number(sale?.hockExtendedSack ?? 0),
  trackExpenses: Number(sale?.trackExpenses ?? 0),
});

export const getCustomersPageData = cache(async (): Promise<CustomerListItem[]> => {
  try {
    await connectDB();

    const [customers, sales, payments] = (await Promise.all([
      Customer.find().select("_id name phone address totalDue saltAmount totalPaid").lean(),
      Sale.find()
        .select("_id customerId saltAmount numberOfBags bagType items total paid hockExtendedSack trackExpenses createdAt editedByName editedByRole editedAt")
        .lean(),
      Transaction.find({ customerId: { $ne: null } }).select("_id customerId amount date").lean(),
    ])) as [CustomerDoc[], SaleDoc[], PaymentDoc[]];

    const salesByCustomer = new Map<string, SaleDoc[]>();
    const latestActivityByCustomer = new Map<string, number>();

    for (const sale of sales) {
      const customerId = String(sale.customerId ?? "");
      if (!customerId) continue;

      const bucket = salesByCustomer.get(customerId) ?? [];
      bucket.push(sale);
      salesByCustomer.set(customerId, bucket);

      const saleTimestamp = getInputTimestamp(String(sale._id ?? ""), sale.createdAt);
      const currentLatest = latestActivityByCustomer.get(customerId) ?? 0;
      if (saleTimestamp > currentLatest) {
        latestActivityByCustomer.set(customerId, saleTimestamp);
      }
    }

    const paymentsByCustomer = new Map<string, PaymentDoc[]>();

    for (const payment of payments) {
      const customerId = String(payment.customerId ?? "");
      if (!customerId) continue;

      const bucket = paymentsByCustomer.get(customerId) ?? [];
      bucket.push(payment);
      paymentsByCustomer.set(customerId, bucket);

      const paymentTimestamp = getInputTimestamp(String(payment._id ?? ""), payment.date);
      const currentLatest = latestActivityByCustomer.get(customerId) ?? 0;
      if (paymentTimestamp > currentLatest) {
        latestActivityByCustomer.set(customerId, paymentTimestamp);
      }
    }

    return customers
      .map((customer) => {
        const id = String(customer._id);
        const customerSales = salesByCustomer.get(id) ?? [];
        const summary = summarizeCustomerLedger(customerSales, paymentsByCustomer.get(id) ?? [], {
          saltAmount: customer.saltAmount,
          totalDue: customer.totalDue,
          totalPaid: customer.totalPaid,
        });
        const lastActivityAt = Math.max(latestActivityByCustomer.get(id) ?? 0, getInputTimestamp(id));
        
        // Optimize: Combine multiple iterations into single pass
        let latestSale: SaleDoc | null = null;
        let totalHockExtendedSack = 0;
        let totalTrackExpenses = 0;
        
        for (const sale of customerSales) {
          const adjustments = resolveSaleAdjustments(sale);
          totalHockExtendedSack += adjustments.hockExtendedSack;
          totalTrackExpenses += adjustments.trackExpenses;
          
          if (!latestSale || compareByLatestInput(
            { id: String(sale._id ?? ""), date: sale.createdAt },
            { id: String(latestSale._id ?? ""), date: latestSale.createdAt }
          ) < 0) {
            latestSale = sale;
          }
        }
        
        const latestSaleAdjustments = latestSale ? resolveSaleAdjustments(latestSale) : { hockExtendedSack: 0, trackExpenses: 0 };
        const latestQuantity = latestSale ? resolveSaleQuantity(latestSale) : 0;
        const latestPricePerKg =
          latestSale && latestQuantity > 0
            ? (Number(latestSale.total ?? 0) - latestSaleAdjustments.hockExtendedSack + latestSaleAdjustments.trackExpenses) /
              latestQuantity
            : 0;

        return {
          _id: id,
          name: customer.name ?? "",
          phone: customer.phone ?? "",
          address: customer.address ?? "",
          totalSalesAmount: summary.totalSalesAmount,
          totalHockExtendedSack,
          totalTrackExpenses,
          totalDue: summary.totalDueAmount,
          saltAmount: summary.totalSaltKg,
          totalPaid: summary.totalPaidAmount,
          lastActivityAt,
          latestSaleId: latestSale?._id ? String(latestSale._id) : null,
          latestSaleSaltAmount: latestQuantity,
          latestSaleDate: latestSale?.createdAt ? String(latestSale.createdAt) : null,
          latestPricePerKg,
          latestNumberOfBags: latestSale ? Number(latestSale.numberOfBags ?? 0) : 0,
          latestBagType: latestSale ? String(latestSale.bagType ?? "50") : "50",
          editedByName: typeof latestSale?.editedByName === "string" ? latestSale.editedByName : "",
          editedByRole: typeof latestSale?.editedByRole === "string" ? latestSale.editedByRole : "",
          editedAt: latestSale?.editedAt ? String(latestSale.editedAt) : null,
        } satisfies CustomerListItem;
      })
      .sort((left, right) =>
        compareByLatestInput(
          { id: String(left._id ?? ""), date: left.lastActivityAt },
          { id: String(right._id ?? ""), date: right.lastActivityAt }
        )
      );
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Customers unavailable, returning empty list.");
      return [];
    }

    throw error;
  }
});
