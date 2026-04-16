import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { compareByLatestInput, getInputTimestamp } from "@/lib/record-order";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";
import { summarizeSupplierLedger } from "@/lib/live-ledgers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();
    const [suppliers, records] = await Promise.all([
      Supplier.find().lean(),
      Transaction.find({ supplierId: { $ne: null } }).lean(),
    ]);

    const recordsBySupplier = new Map<string, Array<Record<string, unknown>>>();
    const latestActivityBySupplier = new Map<string, number>();
    for (const record of records) {
      const supplierId = String(record.supplierId ?? "");
      if (!supplierId) continue;

      const bucket = recordsBySupplier.get(supplierId) ?? [];
      bucket.push(record as unknown as Record<string, unknown>);
      recordsBySupplier.set(supplierId, bucket);

      const recordTimestamp = getInputTimestamp(String(record._id ?? ""), record.date);
      const currentLatest = latestActivityBySupplier.get(supplierId) ?? 0;
      if (recordTimestamp > currentLatest) {
        latestActivityBySupplier.set(supplierId, recordTimestamp);
      }
    }

    const normalized = suppliers
      .map((supplier) => {
        const id = String(supplier._id);
        const summary = summarizeSupplierLedger(recordsBySupplier.get(id) ?? [], {
          saltAmount: supplier.saltAmount,
          totalPaid: supplier.totalPaid,
          totalDue: supplier.totalDue,
        });
        const lastActivityAt = Math.max(latestActivityBySupplier.get(id) ?? 0, getInputTimestamp(id));
        const latestPurchase = (recordsBySupplier.get(id) ?? []).reduce<Record<string, unknown> | null>((latest, current) => {
          if (current.type !== "supplier-buy") return latest;
          if (!latest) return current;

          return compareByLatestInput(
            {
              id: String(current._id ?? ""),
              date: current.date as string | Date | undefined,
            },
            {
              id: String(latest._id ?? ""),
              date: latest.date as string | Date | undefined,
            }
          ) < 0
            ? current
            : latest;
        }, null);
        const latestPricePerMaund =
          latestPurchase && Number(latestPurchase.saltAmount ?? 0) > 0
            ? Number(latestPurchase.totalAmount ?? 0) / Number(latestPurchase.saltAmount ?? 0)
            : 0;

        return {
          _id: supplier._id,
          name: supplier.name,
          phone: supplier.phone,
          address: supplier.address,
          totalDue: summary.totalDueAmount,
          saltAmount: summary.totalSaltKg,
          totalPaid: summary.totalPaidAmount,
          totalPurchaseAmount: summary.totalPurchaseAmount,
          lastActivityAt,
          latestPurchaseId: latestPurchase?._id ?? null,
          latestPricePerMaund,
          editedByName: String(latestPurchase?.editedByName ?? ""),
          editedByRole: String(latestPurchase?.editedByRole ?? ""),
          editedAt: latestPurchase?.editedAt ?? null,
        };
      })
      .sort((left, right) =>
        compareByLatestInput(
          { id: String(left._id ?? ""), date: left.lastActivityAt },
          { id: String(right._id ?? ""), date: right.lastActivityAt }
        )
      );

    return new Response(JSON.stringify(normalized), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Suppliers unavailable, returning empty list.");
      return Response.json([]);
    }

    throw error;
  }
}

export async function POST(req: Request) {
  const originError = validateSameOrigin(req);
  if (originError) return originError;

  const authResult = requireAuth(req, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  await connectDB();
  const data = await req.json();
  const phone = (data.phone || "").toString().trim();
  if (!/^\d{11}$/.test(phone)) {
    return new Response(JSON.stringify({ message: "Phone number must be exactly 11 digits and contain only numbers." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const address = (data.address || "").toString().trim();
  if (!address) {
    return new Response(JSON.stringify({ message: "Address is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supplier = await Supplier.create({
    ...data,
    phone,
    address,
    totalPaid: 0,
  });
  return new Response(JSON.stringify(supplier), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}
