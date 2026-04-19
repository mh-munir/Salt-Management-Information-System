import { connectDB } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { getSuppliersPageData } from "@/lib/suppliers-data";
import Supplier from "@/models/Supplier";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  return Response.json(await getSuppliersPageData());
}

export async function POST(req: Request) {
  const originError = validateSameOrigin(req);
  if (originError) return originError;

  const authResult = requireAuth(req, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  await connectDB();
  const data = await req.json();
  const name = (data.name || "").toString().trim();
  const phone = (data.phone || "").toString().trim();
  const allowDuplicate = data.allowDuplicate === true;

  if (!name) {
    return new Response(JSON.stringify({ message: "Supplier name is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  if (!allowDuplicate) {
    const safeNamePattern = new RegExp(`^${escapeRegex(name)}$`, "i");

    // Check for duplicate name or phone number
    const existingSupplier = await Supplier.findOne({
      $or: [{ name: { $regex: safeNamePattern } }, { phone }],
    });

    if (existingSupplier) {
      const existingName = String(existingSupplier.name ?? "").toLowerCase();
      const message =
        existingName === name.toLowerCase()
          ? "A supplier with this name already exists."
          : "A supplier with this phone number already exists.";
      return new Response(JSON.stringify({ message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Also check customers for duplicates
    const Customer = (await import("@/models/Customer")).default;
    const existingCustomer = await Customer.findOne({
      $or: [{ name: { $regex: safeNamePattern } }, { phone }],
    });

    if (existingCustomer) {
      const existingName = String(existingCustomer.name ?? "").toLowerCase();
      const message =
        existingName === name.toLowerCase()
          ? "A customer with this name already exists."
          : "A customer with this phone number already exists.";
      return new Response(JSON.stringify({ message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const supplier = await Supplier.create({
    ...data,
    name,
    phone,
    address,
    totalPaid: 0,
  });
  return new Response(JSON.stringify(supplier), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}
