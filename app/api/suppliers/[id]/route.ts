import { NextRequest } from "next/server";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest, context: RouteContext<"/api/suppliers/[id]">) {
  const authResult = requireAuth(req, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  await connectDB();
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    return new Response(JSON.stringify({ error: "Supplier not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(supplier), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function PATCH(req: Request, context: RouteContext<"/api/suppliers/[id]">) {
  const originError = validateSameOrigin(req);
  if (originError) return originError;

  const authResult = requireAuth(req, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  await connectDB();

  const body = await req.json();
  const paymentAmount = Number(body.paymentAmount);

  if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
    return new Response(JSON.stringify({ message: "Payment amount must be a valid positive number." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supplier = await Supplier.findById(id);
  if (!supplier) {
    return new Response(JSON.stringify({ message: "Supplier not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currentDue = supplier.totalDue ?? 0;
  if (paymentAmount > currentDue) {
    return new Response(JSON.stringify({ message: "Paid amount cannot exceed current due." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  supplier.totalDue = Math.max(0, currentDue - paymentAmount);
  supplier.totalPaid = (supplier.totalPaid ?? 0) + paymentAmount;
  await supplier.save();

  await Transaction.create({
    supplierId: supplier._id,
    amount: paymentAmount,
    date: body.date ? new Date(body.date) : new Date(),
    type: "supplier-payment",
  });

  return new Response(JSON.stringify(supplier), {
    headers: { "Content-Type": "application/json" },
  });
}
