import { connectDB } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { parseLocalizedNumber } from "@/lib/number-input";
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
  const saltAmount = parseLocalizedNumber(data.saltAmount);
  const totalPrice = parseLocalizedNumber(data.totalPrice);
  const paid = parseLocalizedNumber(data.paid);

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
    supplier = await Supplier.findById(supplierId).select("_id name phone address").lean();
  } else {
    const safeName = supplierName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    supplier = await Supplier.findOne({ name: { $regex: `^${safeName}$`, $options: "i" } })
      .select("_id name phone address")
      .lean();
  }

  if (!supplier) {
    return new Response(JSON.stringify({ message: "Supplier not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dueIncrement = totalPrice - paid;
  const updatedSupplier = await Supplier.findByIdAndUpdate(
    supplier._id,
    {
      $inc: {
        saltAmount,
        totalDue: dueIncrement,
        totalPaid: paid,
      },
    },
    {
      returnDocument: "after",
      projection: "_id name phone address totalDue saltAmount totalPaid",
    }
  ).lean();

  if (!updatedSupplier) {
    return new Response(JSON.stringify({ message: "Supplier not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await Transaction.create({
    supplierId: updatedSupplier._id,
    amount: paid,
    totalAmount: totalPrice,
    saltAmount: saltAmount,
    date: data.date ? new Date(data.date) : new Date(),
    type: "buy",
  });

  return new Response(JSON.stringify({
    message: "Purchase recorded.",
    supplier: {
      _id: updatedSupplier._id,
      name: updatedSupplier.name,
      phone: updatedSupplier.phone,
      address: updatedSupplier.address,
      totalDue: updatedSupplier.totalDue ?? 0,
      saltAmount: updatedSupplier.saltAmount ?? 0,
      totalPaid: updatedSupplier.totalPaid ?? 0,
    },
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
