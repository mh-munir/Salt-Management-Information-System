import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { compareByLatestInput } from "@/lib/record-order";
import Cost from "@/models/Cost";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();
    const costs = await Cost.find().lean();

    const normalized = costs
      .map((cost) => ({
        _id: String(cost._id),
        personName: String(cost.personName ?? "").trim(),
        amount: Number(cost.amount ?? 0),
        purpose: String(cost.purpose ?? "").trim(),
        date: cost.date,
        createdAt: cost.createdAt,
      }))
      .sort((left, right) =>
        compareByLatestInput(
          { id: left._id, date: left.date ?? left.createdAt },
          { id: right._id, date: right.date ?? right.createdAt }
        )
      );

    return Response.json(normalized);
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Costs unavailable, returning empty list.");
      return Response.json([]);
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  await connectDB();
  const body = await request.json();

  const personName = String(body.personName ?? "").trim();
  const purpose = String(body.purpose ?? "").trim();
  const amount = Number(body.amount);
  const date = String(body.date ?? "").trim();

  if (!personName) {
    return Response.json({ message: "Person name is required." }, { status: 400 });
  }

  if (!purpose) {
    return Response.json({ message: "Purpose is required." }, { status: 400 });
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return Response.json({ message: "Amount must be a valid positive number." }, { status: 400 });
  }

  if (!date || Number.isNaN(new Date(date).getTime())) {
    return Response.json({ message: "Valid date is required." }, { status: 400 });
  }

  const cost = await Cost.create({
    personName,
    amount,
    purpose,
    date: new Date(date),
  });

  return Response.json(
    {
      _id: String(cost._id),
      personName: cost.personName,
      amount: cost.amount,
      purpose: cost.purpose,
      date: cost.date,
      createdAt: cost.createdAt,
    },
    { status: 201 }
  );
}
