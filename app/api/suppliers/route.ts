import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { getSuppliersPageData } from "@/lib/suppliers-data";
import Customer from "@/models/Customer";
import Supplier from "@/models/Supplier";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const jsonHeaders = { "Content-Type": "application/json" };

const toTrimmedString = (value: unknown) => String(value ?? "").trim();

const isObjectPayload = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

  try {
    const data = await req.json().catch(() => null);
    if (!isObjectPayload(data)) {
      return new Response(JSON.stringify({ message: "Invalid request body. Provide a valid JSON object." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const name = toTrimmedString(data.name);
    const phone = toTrimmedString(data.phone);
    const address = toTrimmedString(data.address);
    const allowDuplicate = data.allowDuplicate === true;

    if (!name) {
      return new Response(JSON.stringify({ message: "Supplier name is required." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (!/^\d{11}$/.test(phone)) {
      return new Response(
        JSON.stringify({ message: "Phone number must be exactly 11 digits and contain only numbers." }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      );
    }

    if (!address) {
      return new Response(JSON.stringify({ message: "Address is required." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await connectDB();

    if (!allowDuplicate) {
      const safeNamePattern = new RegExp(`^${escapeRegex(name)}$`, "i");

      // Check supplier and customer duplicates concurrently for faster response.
      const [existingSupplier, existingCustomer] = await Promise.all([
        Supplier.findOne({ $or: [{ name: { $regex: safeNamePattern } }, { phone }] })
          .select("name phone")
          .lean(),
        Customer.findOne({ $or: [{ name: { $regex: safeNamePattern } }, { phone }] })
          .select("name phone")
          .lean(),
      ]);

      if (existingSupplier) {
        const existingName = String(existingSupplier.name ?? "").toLowerCase();
        const message =
          existingName === name.toLowerCase()
            ? "A supplier with this name already exists."
            : "A supplier with this phone number already exists.";
        return new Response(JSON.stringify({ message }), {
          status: 409,
          headers: jsonHeaders,
        });
      }

      if (existingCustomer) {
        const existingName = String(existingCustomer.name ?? "").toLowerCase();
        const message =
          existingName === name.toLowerCase()
            ? "A customer with this name already exists."
            : "A customer with this phone number already exists.";
        return new Response(JSON.stringify({ message }), {
          status: 409,
          headers: jsonHeaders,
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
      headers: jsonHeaders,
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return new Response(JSON.stringify({ message: "Database is temporarily unavailable. Please try again." }), {
        status: 503,
        headers: jsonHeaders,
      });
    }

    console.error("Failed to create supplier:", error);
    return new Response(JSON.stringify({ message: "Internal server error." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
