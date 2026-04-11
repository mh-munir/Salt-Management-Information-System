import { NextRequest } from "next/server";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest, context: RouteContext<"/api/customers/[id]">) {
  const authResult = requireAuth(req, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  await connectDB();
  const customer = await Customer.findById(id);
  if (!customer) {
    return new Response(JSON.stringify({ error: "Customer not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(customer), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function PATCH(req: Request, context: RouteContext<"/api/customers/[id]">) {
  const originError = validateSameOrigin(req);
  if (originError) return originError;

  const authResult = requireAuth(req, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  await connectDB();

  const body = await req.json();
  const { action, saltAmount, total, paid, due, paymentAmount, date } = body;
  const validActions = ["sale", "buy", "payment"];

  if (!validActions.includes(action)) {
    return new Response(JSON.stringify({ message: "Action must be sale, buy, or payment." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let saltValue = 0;
  let totalValue = 0;
  let paidValue = 0;
  let dueValue = 0;

  if (action === "payment") {
    const paymentValue = Number(paymentAmount);
    if (Number.isNaN(paymentValue) || paymentValue <= 0) {
      return new Response(JSON.stringify({ message: "Payment amount must be a valid positive number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!date) {
      return new Response(JSON.stringify({ message: "Date is required for payment." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    saltValue = Number(saltAmount);
    totalValue = Number(total);
    paidValue = Number(paid);
    dueValue = Number(due);

    if (Number.isNaN(saltValue) || saltValue < 0) {
      return new Response(JSON.stringify({ message: "Salt amount must be a valid non-negative number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Number.isNaN(totalValue) || totalValue < 0) {
      return new Response(JSON.stringify({ message: "Total amount must be a valid non-negative number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Number.isNaN(paidValue) || paidValue < 0) {
      return new Response(JSON.stringify({ message: "Paid amount must be a valid non-negative number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Number.isNaN(dueValue) || dueValue < 0) {
      return new Response(JSON.stringify({ message: "Due amount must be a valid non-negative number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let updateFields: Record<string, number> = {};

  if (action === "payment") {
    const paymentValue = Number(paymentAmount);
    updateFields = {
      totalDue: -paymentValue, // reduce due
      totalPaid: paymentValue, // increase paid
    };
  } else {
    const saltValue = Number(saltAmount);
    const dueValue = Number(due);
    updateFields = {
      saltAmount: saltValue,
    };
    if (dueValue !== 0) {
      updateFields.totalDue = dueValue;
    }
  }

  const customer = await Customer.findByIdAndUpdate(
    id,
    { $inc: updateFields },
    { returnDocument: "after" }
  ).lean();

  if (!customer) {
    return new Response(JSON.stringify({ message: "Customer not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action === "sale") {
    await Sale.create({
      customerId: id,
      saltAmount: saltValue,
      total: totalValue,
      paid: paidValue,
      due: dueValue,
    });
  } else if (action === "payment") {
    await Transaction.create({
      customerId: id,
      type: "payment",
      amount: Number(paymentAmount),
      date: new Date(date),
    });
  }

  return new Response(JSON.stringify({ message: `Customer ${action} record saved.`, customer }), {
    headers: { "Content-Type": "application/json" },
  });
}
