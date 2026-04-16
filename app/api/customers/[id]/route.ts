import { NextRequest } from "next/server";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { buildEditAuditFields } from "@/lib/edit-audit";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const resolveSaleQuantity = (sale: { items?: Array<{ quantity?: unknown }>; saltAmount?: unknown }) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.reduce((sum, item) => sum + Number(item?.quantity ?? 0), 0);
  }

  return Number(sale.saltAmount ?? 0);
};

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
  const auth = authResult;

  const { id } = await context.params;
  await connectDB();

  const body = await req.json();
  const { action, saltAmount, total, paid, due, paymentAmount, date, saleId, pricePerKg } = body;
  const validActions = ["sale", "buy", "payment", "edit-price"];

  if (!validActions.includes(action)) {
    return new Response(JSON.stringify({ message: "Action must be sale, buy, payment, or edit-price." }), {
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
  } else if (action === "edit-price") {
    const nextPrice = Number(pricePerKg);
    if (Number.isNaN(nextPrice) || nextPrice < 0) {
      return new Response(JSON.stringify({ message: "Price per KG must be a valid non-negative number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!saleId) {
      return new Response(JSON.stringify({ message: "Sale record is required for editing price." }), {
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

    if (Number.isNaN(dueValue)) {
      return new Response(JSON.stringify({ message: "Due amount must be a valid number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let updateFields: Record<string, number> = {};

  if (action === "edit-price") {
    const sale = await Sale.findOne({ _id: saleId, customerId: id }).lean();
    if (!sale) {
      return new Response(JSON.stringify({ message: "Sale record not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const quantityKg = resolveSaleQuantity(sale);
    if (quantityKg <= 0) {
      return new Response(JSON.stringify({ message: "This sale has no quantity to recalculate price." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const currentTotal = Number(sale.total ?? 0);
    const nextTotal = Number((quantityKg * Number(pricePerKg)).toFixed(2));
    const totalDelta = nextTotal - currentTotal;
    const currentDue = Number(sale.due ?? 0);
    const nextDue = Number((currentDue + totalDelta).toFixed(2));
    const auditFields = await buildEditAuditFields(auth);

    await Sale.updateOne(
      { _id: sale._id },
      {
        $set: {
          total: nextTotal,
          due: nextDue,
          ...auditFields,
        },
      },
      { strict: false }
    );

    const updatedSale = await Sale.findById(sale._id).lean();
    if (!updatedSale) {
      return new Response(JSON.stringify({ message: "Sale record not found after update." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $inc: { totalDue: totalDelta } },
      { returnDocument: "after" }
    ).lean();

    if (!customer) {
      return new Response(JSON.stringify({ message: "Customer not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Customer price updated.",
        customer,
        sale: {
          _id: updatedSale._id,
          total: updatedSale.total,
          due: updatedSale.due,
          editedByName: updatedSale.editedByName,
          editedByRole: updatedSale.editedByRole,
          editedAt: updatedSale.editedAt,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } else if (action === "payment") {
    const paymentValue = Number(paymentAmount);
    updateFields = {
      totalDue: -paymentValue, // reduce due
      totalPaid: paymentValue, // increase paid
    };
  } else {
    const saltValue = Number(saltAmount);
    const totalValue = Number(total);
    const paidValue = Number(paid);
    const dueValue = totalValue - paidValue;

    if (action === "sale") {
      updateFields = {
        saltAmount: saltValue,
        totalPaid: paidValue,
        totalDue: dueValue,
      };
    } else if (action === "buy") {
      updateFields = {
        saltAmount: -saltValue,
        totalPaid: paidValue,
        totalDue: -dueValue,
      };
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
    const saltValue = Number(saltAmount);
    const totalValue = Number(total);
    const paidValue = Number(paid);
    const dueValue = totalValue - paidValue;

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
