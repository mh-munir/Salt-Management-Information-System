import { connectDB } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(req: Request) {
  const originError = validateSameOrigin(req);
  if (originError) return originError;

  const authResult = requireAuth(req, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  await connectDB();
  const data = await req.json();

  const supplierId = (data.supplierId || "").toString().trim();
  const supplierName = (data.supplierName || "").toString().trim();
  const saltAmount = Number(data.saltAmount);
  const totalPrice = Number(data.totalPrice);
  const paid = Number(data.paid);

  if (!supplierId && !supplierName) {
    return new Response(JSON.stringify({ message: "Supplier name is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (Number.isNaN(saltAmount) || saltAmount < 0) {
    return new Response(JSON.stringify({ message: "Salt amount must be a valid non-negative number." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (Number.isNaN(totalPrice) || totalPrice < 0) {
    return new Response(JSON.stringify({ message: "Total price must be a valid non-negative number." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (Number.isNaN(paid) || paid < 0) {
    return new Response(JSON.stringify({ message: "Paid amount must be a valid non-negative number." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let supplier = null;
  if (supplierId) {
    supplier = await Supplier.findById(supplierId);
  } else {
    const safeName = supplierName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    supplier = await Supplier.findOne({ name: { $regex: `^${safeName}$`, $options: "i" } });
  }

  if (!supplier) {
    return new Response(JSON.stringify({ message: "Supplier not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  supplier.saltAmount = (supplier.saltAmount ?? 0) + saltAmount;
  supplier.totalDue = (supplier.totalDue ?? 0) + (totalPrice - paid);
  supplier.totalPaid = (supplier.totalPaid ?? 0) + paid;
  await supplier.save();

  await Transaction.create({
    supplierId: supplier._id,
    amount: paid,
    totalAmount: totalPrice,
    saltAmount: saltAmount,
    date: data.date ? new Date(data.date) : new Date(),
    type: "supplier-buy",
  });

  return new Response(JSON.stringify({
    message: "Purchase recorded.",
    supplier: {
      _id: supplier._id,
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      totalDue: supplier.totalDue ?? 0,
      saltAmount: supplier.saltAmount ?? 0,
      totalPaid: supplier.totalPaid ?? 0,
    },
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
