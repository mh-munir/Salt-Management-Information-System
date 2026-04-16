import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";
import { summarizeCustomerLedger, summarizeSupplierLedger, sumSaleQuantity, toNumber } from "@/lib/live-ledgers";
import { compareByLatestInput } from "@/lib/record-order";
import { getSharedSidebarBrandingSnapshot } from "@/lib/sidebar-branding.server";

type RawDoc = Record<string, unknown>;

export type CustomerInvoiceRecord = {
  id: string;
  date?: Date;
  type: "sale" | "payment";
  label: string;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  note: string;
};

export type CustomerInvoiceData = {
  id: string;
  name: string;
  phone: string;
  address: string;
  invoiceNumber: string;
  generatedAt: Date;
  totalSaltKg: number;
  totalSalesAmount: number;
  paidWithSalesAmount: number;
  paidWithPaymentsAmount: number;
  totalReceivedAmount: number;
  totalDueAmount: number;
  records: CustomerInvoiceRecord[];
};

export type SupplierInvoiceRecord = {
  id: string;
  date?: Date;
  type: "purchase" | "payment";
  label: string;
  quantityMaund: number;
  pricePerMaund: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  note: string;
};

export type SupplierInvoiceData = {
  id: string;
  name: string;
  phone: string;
  address: string;
  invoiceNumber: string;
  generatedAt: Date;
  totalSaltMaund: number;
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  records: SupplierInvoiceRecord[];
};

export type InvoiceBranding = {
  logoUrl: string;
  heading: string;
  subheading: string;
};

const DEFAULT_INVOICE_BRANDING: InvoiceBranding = {
  logoUrl: "",
  heading: "Salt Mill System",
  subheading: "Salt Mill System",
};

const sortInvoiceRecordsByLatestInput = <T extends { id: string; date?: Date }>(records: T[]) =>
  [...records].sort((left, right) =>
    compareByLatestInput(
      { id: left.id, date: left.date },
      { id: right.id, date: right.date }
    )
  );

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
};

export async function getInvoiceBranding(): Promise<InvoiceBranding> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;

  if (!auth) return DEFAULT_INVOICE_BRANDING;

  const sharedBranding = await getSharedSidebarBrandingSnapshot();

  return {
    logoUrl: sharedBranding.sidebarLogoUrl?.toString().trim() ?? DEFAULT_INVOICE_BRANDING.logoUrl,
    heading: sharedBranding.sidebarHeading?.toString().trim() || DEFAULT_INVOICE_BRANDING.heading,
    subheading: sharedBranding.sidebarSubheading?.toString().trim() || DEFAULT_INVOICE_BRANDING.subheading,
  };
}

export async function getCustomerInvoiceData(id: string): Promise<CustomerInvoiceData | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectDB();

  const customer = (await Customer.findById(id).lean()) as RawDoc | null;
  if (!customer) return null;

  const sales = ((await Sale.find({ customerId: id }).sort({ createdAt: -1 }).lean()) ?? []) as RawDoc[];
  const payments = ((await Transaction.find({ customerId: id }).sort({ date: -1 }).lean()) ?? []) as RawDoc[];

  const saleRecords: CustomerInvoiceRecord[] = sales.map((sale, index) => {
    const quantityKg = sumSaleQuantity(sale);
    const totalAmount = toNumber(sale.total);
    const paidAmount = toNumber(sale.paid);
    const dueAmount = toNumber(sale.due);
    const pricePerKg = quantityKg > 0 ? totalAmount / quantityKg : 0;

    return {
      id: String(sale._id ?? `sale-${index}`),
      date: toDate(sale.createdAt),
      type: "sale",
      label: "Sale entry",
      quantityKg,
      pricePerKg,
      totalAmount,
      paidAmount,
      dueAmount,
      note: quantityKg > 0 ? `${quantityKg.toFixed(2)} kg delivered` : "Sale amount recorded",
    };
  });

  const paymentRecords: CustomerInvoiceRecord[] = payments.map((payment, index) => ({
    id: String(payment._id ?? `payment-${index}`),
    date: toDate(payment.date),
    type: "payment",
    label: payment.type === "payment" ? "Payment received" : "Transaction",
    quantityKg: 0,
    pricePerKg: 0,
    totalAmount: 0,
    paidAmount: toNumber(payment.amount),
    dueAmount: 0,
    note: payment.type === "payment" ? "Customer payment" : "Customer transaction",
  }));

  const records = sortInvoiceRecordsByLatestInput([...saleRecords, ...paymentRecords]);

  const summary = summarizeCustomerLedger(sales, payments, {
    saltAmount: customer.saltAmount,
    totalDue: customer.totalDue,
    totalPaid: customer.totalPaid,
  });

  return {
    id: String(customer._id),
    name: customer.name?.toString() ?? "Customer",
    phone: customer.phone?.toString() ?? "-",
    address: customer.address?.toString() ?? "-",
    invoiceNumber: `CUS-${String(customer._id).slice(-6).toUpperCase()}`,
    generatedAt: new Date(),
    totalSaltKg: summary.totalSaltKg,
    totalSalesAmount: summary.totalSalesAmount,
    paidWithSalesAmount: summary.paidWithSalesAmount,
    paidWithPaymentsAmount: summary.paidWithPaymentsAmount,
    totalReceivedAmount: summary.totalReceivedAmount,
    totalDueAmount: summary.totalDueAmount,
    records,
  };
}

export async function getSupplierInvoiceData(id: string): Promise<SupplierInvoiceData | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectDB();

  const supplier = (await Supplier.findById(id).lean()) as RawDoc | null;
  if (!supplier) return null;

  const transactions = ((await Transaction.find({ supplierId: id }).sort({ date: -1 }).lean()) ?? []) as RawDoc[];

  const records: SupplierInvoiceRecord[] = sortInvoiceRecordsByLatestInput(
    transactions.map<SupplierInvoiceRecord>((transaction, index) => {
      const totalAmount = toNumber(transaction.totalAmount);
      const paidAmount = toNumber(transaction.amount);
      const quantityMaund = toNumber(transaction.saltAmount);
      const pricePerMaund = quantityMaund > 0 ? totalAmount / quantityMaund : 0;

      return {
        id: String(transaction._id ?? `supplier-record-${index}`),
        date: toDate(transaction.date),
        type: transaction.type === "supplier-buy" ? "purchase" : "payment",
        label: transaction.type === "supplier-buy" ? "Salt purchase" : "Supplier payment",
        quantityMaund,
        pricePerMaund,
        totalAmount,
        paidAmount,
        dueAmount: totalAmount > 0 ? totalAmount - paidAmount : 0,
        note:
          transaction.type === "supplier-buy"
            ? totalAmount > 0
              ? "Purchase entry"
              : "Legacy purchase entry"
            : "Payment adjustment",
      };
    })
  );

  const summary = summarizeSupplierLedger(transactions, {
    saltAmount: supplier.saltAmount,
    totalPaid: supplier.totalPaid,
    totalDue: supplier.totalDue,
  });

  return {
    id: String(supplier._id),
    name: supplier.name?.toString() ?? "Supplier",
    phone: supplier.phone?.toString() ?? "-",
    address: supplier.address?.toString() ?? "-",
    invoiceNumber: `SUP-${String(supplier._id).slice(-6).toUpperCase()}`,
    generatedAt: new Date(),
    totalSaltMaund: summary.totalSaltKg,
    totalPurchaseAmount: summary.totalPurchaseAmount,
    totalPaidAmount: summary.totalPaidAmount,
    totalDueAmount: summary.totalDueAmount,
    records,
  };
}
