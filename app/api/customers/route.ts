import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { compareByLatestInput, getInputTimestamp } from "@/lib/record-order";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";
import { summarizeCustomerLedger } from "@/lib/live-ledgers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const resolveSaleQuantity = (sale: { items?: Array<{ quantity?: unknown }>; saltAmount?: unknown }) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.reduce((sum, item) => sum + Number(item?.quantity ?? 0), 0);
  }

  return Number(sale.saltAmount ?? 0);
};

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();
    const [customers, sales, payments] = await Promise.all([
      Customer.find().lean(),
      Sale.find().lean(),
      Transaction.find({ customerId: { $ne: null } }).lean(),
    ]);

    const salesByCustomer = new Map<string, Array<Record<string, unknown>>>();
    const latestActivityByCustomer = new Map<string, number>();
    for (const sale of sales) {
      const customerId = String(sale.customerId ?? "");
      if (!customerId) continue;

      const bucket = salesByCustomer.get(customerId) ?? [];
      bucket.push(sale as unknown as Record<string, unknown>);
      salesByCustomer.set(customerId, bucket);

      const saleTimestamp = getInputTimestamp(String(sale._id ?? ""), sale.createdAt);
      const currentLatest = latestActivityByCustomer.get(customerId) ?? 0;
      if (saleTimestamp > currentLatest) {
        latestActivityByCustomer.set(customerId, saleTimestamp);
      }
    }

    const paymentsByCustomer = new Map<string, Array<Record<string, unknown>>>();
    for (const payment of payments) {
      const customerId = String(payment.customerId ?? "");
      if (!customerId) continue;

      const bucket = paymentsByCustomer.get(customerId) ?? [];
      bucket.push(payment as unknown as Record<string, unknown>);
      paymentsByCustomer.set(customerId, bucket);

      const paymentTimestamp = getInputTimestamp(String(payment._id ?? ""), payment.date);
      const currentLatest = latestActivityByCustomer.get(customerId) ?? 0;
      if (paymentTimestamp > currentLatest) {
        latestActivityByCustomer.set(customerId, paymentTimestamp);
      }
    }

    const normalized = customers
      .map((customer) => {
        const id = String(customer._id);
        const summary = summarizeCustomerLedger(
          salesByCustomer.get(id) ?? [],
          paymentsByCustomer.get(id) ?? [],
          {
            saltAmount: customer.saltAmount,
            totalDue: customer.totalDue,
            totalPaid: customer.totalPaid,
          }
        );
        const lastActivityAt = Math.max(latestActivityByCustomer.get(id) ?? 0, getInputTimestamp(id));
        const latestSale = (salesByCustomer.get(id) ?? []).reduce<Record<string, unknown> | null>((latest, current) => {
          if (!latest) return current;

          return compareByLatestInput(
            {
              id: String(current._id ?? ""),
              date: current.createdAt as string | Date | undefined,
            },
            {
              id: String(latest._id ?? ""),
              date: latest.createdAt as string | Date | undefined,
            }
          ) < 0
            ? current
            : latest;
        }, null);
        const latestPricePerKg =
          latestSale && resolveSaleQuantity(latestSale as { items?: Array<{ quantity?: unknown }>; saltAmount?: unknown }) > 0
            ? Number(latestSale.total ?? 0) /
              resolveSaleQuantity(latestSale as { items?: Array<{ quantity?: unknown }>; saltAmount?: unknown })
            : 0;

        return {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          totalSalesAmount: summary.totalSalesAmount,
          totalDue: summary.totalDueAmount,
          saltAmount: summary.totalSaltKg,
          totalPaid: summary.totalPaidAmount,
          lastActivityAt,
          latestSaleId: latestSale?._id ?? null,
          latestPricePerKg,
          editedByName: String(latestSale?.editedByName ?? ""),
          editedByRole: String(latestSale?.editedByRole ?? ""),
          editedAt: latestSale?.editedAt ?? null,
        };
      })
      .sort((left, right) =>
        compareByLatestInput(
          { id: String(left._id ?? ""), date: left.lastActivityAt },
          { id: String(right._id ?? ""), date: right.lastActivityAt }
        )
      );

    return Response.json(normalized);
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Customers unavailable, returning empty list.");
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

  const c = await Customer.create({
    ...data,
    phone,
    address,
  });
  return Response.json(c);
}
