import { connectDB, isMongoConnectionError } from "@/lib/db";
import { summarizeSupplierLedger } from "@/lib/live-ledgers";
import { compareByLatestInput, getInputTimestamp } from "@/lib/record-order";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

type SupplierDoc = {
  _id: unknown;
  name?: string;
  phone?: string;
  address?: string;
  totalDue?: number;
  saltAmount?: number;
  totalPaid?: number;
};

type SupplierRecordDoc = {
  _id: unknown;
  supplierId?: unknown;
  type?: unknown;
  amount?: unknown;
  totalAmount?: unknown;
  saltAmount?: unknown;
  date?: string | Date;
  editedByName?: unknown;
  editedByRole?: unknown;
  editedAt?: string | Date | null;
};

export type SupplierListItem = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  totalDue?: number;
  saltAmount?: number;
  totalPaid?: number;
  totalPurchaseAmount?: number;
  lastActivityAt?: number;
  latestPurchaseId?: string | null;
  latestPricePerMaund?: number;
  editedByName?: string;
  editedByRole?: string;
  editedAt?: string | null;
};

export async function getSuppliersPageData(): Promise<SupplierListItem[]> {
  try {
    await connectDB();

    const [suppliers, records] = (await Promise.all([
      Supplier.find().select("_id name phone address totalDue saltAmount totalPaid").lean(),
      Transaction.find({ supplierId: { $ne: null } })
        .select("_id supplierId type amount totalAmount saltAmount date editedByName editedByRole editedAt")
        .lean(),
    ])) as [SupplierDoc[], SupplierRecordDoc[]];

    const recordsBySupplier = new Map<string, SupplierRecordDoc[]>();
    const latestActivityBySupplier = new Map<string, number>();

    for (const record of records) {
      const supplierId = String(record.supplierId ?? "");
      if (!supplierId) continue;

      const bucket = recordsBySupplier.get(supplierId) ?? [];
      bucket.push(record);
      recordsBySupplier.set(supplierId, bucket);

      const recordTimestamp = getInputTimestamp(String(record._id ?? ""), record.date);
      const currentLatest = latestActivityBySupplier.get(supplierId) ?? 0;
      if (recordTimestamp > currentLatest) {
        latestActivityBySupplier.set(supplierId, recordTimestamp);
      }
    }

    return suppliers
      .map((supplier) => {
        const id = String(supplier._id);
        const supplierRecords = recordsBySupplier.get(id) ?? [];
        const summary = summarizeSupplierLedger(supplierRecords, {
          saltAmount: supplier.saltAmount,
          totalPaid: supplier.totalPaid,
          totalDue: supplier.totalDue,
        });
        const lastActivityAt = Math.max(latestActivityBySupplier.get(id) ?? 0, getInputTimestamp(id));
        const latestPurchase = supplierRecords.reduce<SupplierRecordDoc | null>((latest, current) => {
          if (current.type !== "buy" && current.type !== "supplier-buy") return latest;
          if (!latest) return current;

          return compareByLatestInput(
            { id: String(current._id ?? ""), date: current.date },
            { id: String(latest._id ?? ""), date: latest.date }
          ) < 0
            ? current
            : latest;
        }, null);
        const latestPricePerMaund =
          latestPurchase && Number(latestPurchase.saltAmount ?? 0) > 0
            ? Number(latestPurchase.totalAmount ?? 0) / Number(latestPurchase.saltAmount ?? 0)
            : 0;

        return {
          _id: id,
          name: supplier.name ?? "",
          phone: supplier.phone ?? "",
          address: supplier.address ?? "",
          totalDue: summary.totalDueAmount,
          saltAmount: summary.totalSaltKg,
          totalPaid: summary.totalPaidAmount,
          totalPurchaseAmount: summary.totalPurchaseAmount,
          lastActivityAt,
          latestPurchaseId: latestPurchase?._id ? String(latestPurchase._id) : null,
          latestPricePerMaund,
          editedByName: typeof latestPurchase?.editedByName === "string" ? latestPurchase.editedByName : "",
          editedByRole: typeof latestPurchase?.editedByRole === "string" ? latestPurchase.editedByRole : "",
          editedAt: latestPurchase?.editedAt ? String(latestPurchase.editedAt) : null,
        } satisfies SupplierListItem;
      })
      .sort((left, right) =>
        compareByLatestInput(
          { id: String(left._id ?? ""), date: left.lastActivityAt },
          { id: String(right._id ?? ""), date: right.lastActivityAt }
        )
      );
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Suppliers unavailable, returning empty list.");
      return [];
    }

    throw error;
  }
}
