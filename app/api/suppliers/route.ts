import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
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
    for (const record of records) {
      const supplierId = String(record.supplierId ?? "");
      if (!supplierId) continue;

      const bucket = recordsBySupplier.get(supplierId) ?? [];
      bucket.push(record as unknown as Record<string, unknown>);
      recordsBySupplier.set(supplierId, bucket);
    }

    const normalized = suppliers.map((supplier) => {
      const id = String(supplier._id);
      const summary = summarizeSupplierLedger(recordsBySupplier.get(id) ?? [], {
        saltAmount: supplier.saltAmount,
        totalPaid: supplier.totalPaid,
        totalDue: supplier.totalDue,
      });

      return {
        _id: supplier._id,
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        totalDue: summary.totalDueAmount,
        saltAmount: summary.totalSaltKg,
        totalPaid: summary.totalPaidAmount,
        totalPurchaseAmount: summary.totalPurchaseAmount,
      };
    });

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
