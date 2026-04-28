import { NextRequest } from "next/server";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { buildEditAuditFields } from "@/lib/edit-audit";
import { parseLocalizedNumber } from "@/lib/number-input";
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
  const auth = authResult;

  const { id } = await context.params;
  await connectDB();

  const body = await req.json();
  const action = body.action === "edit-price" ? "edit-price" : "payment";

  if (action === "edit-price") {
    const transactionId = String(body.transactionId ?? "").trim();
    const supplierName = String(body.supplierName ?? "").trim();
    const saltAmount = parseLocalizedNumber(body.saltAmount);
    const pricePerMaund = parseLocalizedNumber(body.pricePerMaund);

    if (!transactionId) {
      return new Response(JSON.stringify({ message: "Purchase record is required for editing price." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!supplierName) {
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

    if (Number.isNaN(pricePerMaund) || pricePerMaund < 0) {
      return new Response(JSON.stringify({ message: "Price per Maund must be a valid non-negative number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const record = await Transaction.findOne({
      _id: transactionId,
      supplierId: id,
      type: { $in: ["buy", "supplier-buy"] },
    }).lean();

    if (!record) {
      return new Response(JSON.stringify({ message: "Purchase record not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const quantityMaund = Number(record.saltAmount ?? 0);
    const currentTotal = Number(record.totalAmount ?? 0);
    const nextTotal = Number((saltAmount * pricePerMaund).toFixed(2));
    const totalDelta = nextTotal - currentTotal;
    const quantityDelta = saltAmount - quantityMaund;
    const auditFields = await buildEditAuditFields(auth);

    await Transaction.updateOne(
      { _id: record._id },
      {
        $set: {
          saltAmount,
          totalAmount: nextTotal,
          ...auditFields,
        },
      },
      { strict: false }
    );

    const updatedRecord = await Transaction.findById(record._id).lean();
    if (!updatedRecord) {
      return new Response(JSON.stringify({ message: "Purchase record not found after update." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      {
        $inc: {
          totalDue: totalDelta,
          saltAmount: quantityDelta,
        },
        $set: {
          name: supplierName,
        },
      },
      { returnDocument: "after" }
    ).lean();

    if (!supplier) {
      return new Response(JSON.stringify({ message: "Supplier not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Supplier price updated.",
        supplier,
        record: {
          _id: updatedRecord._id,
          saltAmount: updatedRecord.saltAmount,
          totalAmount: updatedRecord.totalAmount,
          editedByName: updatedRecord.editedByName,
          editedByRole: updatedRecord.editedByRole,
          editedAt: updatedRecord.editedAt,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const paymentAmount = parseLocalizedNumber(body.paymentAmount);

  if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
    return new Response(JSON.stringify({ message: "Payment amount must be a valid positive number." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supplier = await Supplier.findByIdAndUpdate(
    id,
    {
      $inc: {
        totalDue: -paymentAmount,
        totalPaid: paymentAmount,
      },
    },
    { returnDocument: "after" }
  ).lean();

  if (!supplier) {
    return new Response(JSON.stringify({ message: "Supplier not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await Transaction.create({
    supplierId: id,
    amount: paymentAmount,
    date: body.date ? new Date(body.date) : new Date(),
    type: "payment",
  });

  return new Response(JSON.stringify(supplier), {
    headers: { "Content-Type": "application/json" },
  });
}
