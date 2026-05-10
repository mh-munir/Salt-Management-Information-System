import { connectDB, isMongoConnectionError } from "@/lib/db";
import { z } from "zod";
import { apiError, apiSuccess, handleRouteError, parseJsonBody } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { compareByLatestInput } from "@/lib/record-order";
import { parseLocalizedNumber } from "@/lib/number-input";
import { sanitizeTextInput } from "@/lib/input-sanitization";
import Cost from "@/models/Cost";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const costPayloadSchema = z.object({
  personName: z.string().min(1).max(80),
  purpose: z.string().min(1).max(160),
  amount: z.union([z.string(), z.number()]),
  date: z.string().min(1).max(40),
});

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

    return apiSuccess(normalized);
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return apiSuccess([]);
    }

    return handleRouteError(error, { route: "/api/costs" });
  }
}

export async function POST(request: Request) {
  try {
    const originError = validateSameOrigin(request);
    if (originError) return originError;

    const authResult = requireAuth(request, ["admin", "superadmin"]);
    if (authResult instanceof Response) return authResult;

    const parsedBody = await parseJsonBody(request, costPayloadSchema);
    if (!parsedBody.success) return parsedBody.response;

    await connectDB();

    const personName = sanitizeTextInput(parsedBody.data.personName, { maxLength: 80 });
    const purpose = sanitizeTextInput(parsedBody.data.purpose, { maxLength: 160 });
    const amount = parseLocalizedNumber(parsedBody.data.amount);
    const date = sanitizeTextInput(parsedBody.data.date, { maxLength: 40 });

    if (Number.isNaN(amount) || amount <= 0) {
      return apiError("Amount must be a valid positive number.", 400, { code: "invalid_amount" });
    }

    if (!date || Number.isNaN(new Date(date).getTime())) {
      return apiError("Valid date is required.", 400, { code: "invalid_date" });
    }

    const cost = await Cost.create({
      personName,
      amount,
      purpose,
      date: new Date(date),
    });

    logActivity({
      action: "cost.create",
      actorId: authResult.userId,
      actorEmail: authResult.email,
      actorRole: authResult.role,
      targetType: "cost",
      targetId: String(cost._id),
      metadata: { amount },
    });

    return apiSuccess(
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
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return apiError("Database is temporarily unavailable. Please try again.", 503, { code: "db_unavailable" });
    }

    return handleRouteError(error, { route: "/api/costs" });
  }
}
