import { connectDB } from "@/lib/db";
import { hashPassword, requireAuth, validateSameOrigin } from "@/lib/auth";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function PATCH(request: Request, context: RouteContext<"/api/admin-users/[id]/password">) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const newPassword = String(payload?.newPassword ?? "").trim();

  if (!newPassword) {
    return Response.json({ message: "New password is required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return Response.json({ message: "Password must be at least 8 characters." }, { status: 400 });
  }

  await connectDB();

  const targetUser = await User.findById(id).select("_id email role");
  if (!targetUser) {
    return Response.json({ message: "User not found." }, { status: 404 });
  }

  if (targetUser.role === "superadmin" && authResult.userId && String(authResult.userId) !== String(targetUser._id)) {
    return Response.json(
      { message: "Super admin password can only be changed by that super admin account." },
      { status: 403 }
    );
  }

  const hashed = hashPassword(newPassword);
  targetUser.passwordHash = hashed.hash;
  targetUser.passwordSalt = hashed.salt;
  await targetUser.save();

  return Response.json({ message: "Password updated successfully." });
}
