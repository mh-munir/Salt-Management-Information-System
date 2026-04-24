import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { ensureEnvSuperadminUser } from "@/lib/superadmin";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const ACTIVE_WINDOW_MS = 20 * 60 * 1000;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();
    await ensureEnvSuperadminUser(authResult);
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
      .select("name email role avatarUrl createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .lean();

    const now = Date.now();
    const currentUserId = authResult.userId ? String(authResult.userId) : "";
    const currentUserEmail = authResult.email.trim().toLowerCase();

    const adminsWithStatus = admins.map((admin) => {
      const lastLoginAt =
        admin.lastLoginAt instanceof Date
          ? admin.lastLoginAt
          : admin.lastLoginAt
            ? new Date(admin.lastLoginAt)
            : null;
      const isRecentlyActive = Boolean(lastLoginAt && now - lastLoginAt.getTime() <= ACTIVE_WINDOW_MS);
      const isCurrentLoggedInUser =
        (currentUserId && String(admin._id) === currentUserId) ||
        String(admin.email ?? "").trim().toLowerCase() === currentUserEmail;
      const isActive = isRecentlyActive || isCurrentLoggedInUser;

      return {
        ...admin,
        isActive,
      };
    });

    return Response.json(adminsWithStatus, {
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
