import { connectDB } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidImageUrl = (value: string) =>
  /^https?:\/\/.+/i.test(value) || /^data:image\/[a-zA-Z]+;base64,.+/i.test(value);

export async function PATCH(request: Request, context: RouteContext<"/api/admin-users/[id]">) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);

  const name = String(payload?.name ?? "").trim();
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const avatarUrl = String(payload?.avatarUrl ?? "").trim();

  if (!name || !email) {
    return Response.json({ message: "Name and email are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return Response.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  if (avatarUrl && !isValidImageUrl(avatarUrl)) {
    return Response.json(
      { message: "Avatar must be a valid http(s) URL or data:image base64 value." },
      { status: 400 }
    );
  }

  await connectDB();

  const targetUser = await User.findById(id).select("_id email role name avatarUrl");
  if (!targetUser) {
    return Response.json({ message: "Admin user not found." }, { status: 404 });
  }

  const isSelf = authResult.userId ? String(authResult.userId) === String(targetUser._id) : false;
  const canEdit = authResult.role === "superadmin" || isSelf;

  if (!canEdit) {
    return Response.json({ message: "Only super admin can edit other admin accounts." }, { status: 403 });
  }

  const existingUser = await User.findOne({
    email,
    _id: { $ne: targetUser._id },
  }).select("_id");

  if (existingUser) {
    return Response.json({ message: "This email is already in use." }, { status: 409 });
  }

  targetUser.name = name;
  targetUser.email = email;
  targetUser.avatarUrl = avatarUrl;
  await targetUser.save();

  return Response.json({
    message: "Admin profile updated successfully.",
    user: {
      _id: String(targetUser._id),
      name: targetUser.name ?? "",
      email: targetUser.email,
      role: targetUser.role,
      avatarUrl: targetUser.avatarUrl ?? "",
    },
  });
}

export async function DELETE(request: Request, context: RouteContext<"/api/admin-users/[id]">) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  await connectDB();

  const targetUser = await User.findById(id).select("_id role email");
  if (!targetUser) {
    return Response.json({ message: "Admin user not found." }, { status: 404 });
  }

  if (targetUser.role === "superadmin") {
    return Response.json({ message: "Super admin account cannot be deleted." }, { status: 403 });
  }

  await User.deleteOne({ _id: targetUser._id });

  return Response.json({
    message: "Admin user deleted successfully.",
    userId: String(targetUser._id),
    email: targetUser.email,
  });
}
