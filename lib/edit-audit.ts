import type { AuthTokenPayload } from "@/lib/auth";
import { isValidMongoObjectId } from "@/lib/db";
import User from "@/models/User";
import { ensureEnvSuperadminUser } from "@/lib/superadmin";

const getRoleLabel = (role?: string | null) => (role === "superadmin" ? "Super Admin" : "Admin");

export async function buildEditAuditFields(auth: AuthTokenPayload) {
  let user =
    auth.userId && isValidMongoObjectId(auth.userId)
      ? await User.findById(auth.userId).select("_id name email role")
      : null;

  if (!user) {
    user = await User.findOne({ email: auth.email.toLowerCase() }).select("_id name email role");
  }

  if (!user) {
    user = await ensureEnvSuperadminUser(auth);
  }

  const role = user?.role ?? auth.role;
  const email = user?.email ?? auth.email;
  const fallbackName = email?.split("@")[0] ?? "";
  const trimmedName = user?.name?.trim() ?? "";
  const displayName = trimmedName || fallbackName || getRoleLabel(role);

  return {
    editedByUserId: user?._id ?? null,
    editedByName: displayName,
    editedByRole: role,
    editedByEmail: email,
    editedAt: new Date(),
  };
}
