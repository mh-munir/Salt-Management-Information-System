import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { ensureEnvSuperadminUser } from "@/lib/superadmin";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();
    await ensureEnvSuperadminUser(authResult);
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
      .select("name email role avatarUrl createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return Response.json(admins, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return Response.json(
        { message: "Admin list is temporarily unavailable. Please try again shortly." },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["superadmin"]);
  if (authResult instanceof Response) return authResult;

  return Response.json(
    { message: "Direct admin creation is disabled. Use OTP request and verification flow." },
    { status: 400 }
  );
}
