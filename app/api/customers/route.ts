import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { getCustomersPageData } from "@/lib/customers-data";
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

  return Response.json(await getCustomersPageData());
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
      return new Response(JSON.stringify({ message: "Customer name is required." }), {
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

      // Check customer and supplier duplicates concurrently for faster response.
      const [existingCustomer, existingSupplier] = await Promise.all([
        Customer.findOne({ $or: [{ name: { $regex: safeNamePattern } }, { phone }] })
          .select("name phone")
          .lean(),
        Supplier.findOne({ $or: [{ name: { $regex: safeNamePattern } }, { phone }] })
          .select("name phone")
          .lean(),
      ]);

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
    }

    const customer = await Customer.create({
      ...data,
      name,
      phone,
      address,
    });
    return new Response(JSON.stringify(customer), {
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

    console.error("Failed to create customer:", error);
    return new Response(JSON.stringify({ message: "Internal server error." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
