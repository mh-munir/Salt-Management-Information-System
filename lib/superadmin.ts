import type { AuthTokenPayload } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { isValidMongoObjectId } from "@/lib/db";
import User from "@/models/User";

const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL?.trim().toLowerCase() ?? "";
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD?.trim() ?? "";
const SUPERADMIN_DISPLAY_NAME = "Super Admin";
const SUPERADMIN_ENFORCEMENT_INTERVAL_MS = 60_000;

type SuperadminCheckCache = {
  lastRunAt: number;
  hadRecentDemotion: boolean;
};

const globalForSuperadmin = globalThis as typeof globalThis & {
  superadminCheckCache?: SuperadminCheckCache;
};

const superadminCheckCache = globalForSuperadmin.superadminCheckCache ?? {
  lastRunAt: 0,
  hadRecentDemotion: false,
};

globalForSuperadmin.superadminCheckCache = superadminCheckCache;

export function isEnvSuperadminAuth(auth: Pick<AuthTokenPayload, "email" | "role">) {
  return (
    auth.role === "superadmin" &&
    Boolean(SUPERUSER_EMAIL && SUPERUSER_PASSWORD) &&
    auth.email.trim().toLowerCase() === SUPERUSER_EMAIL
  );
}

export async function ensureEnvSuperadminUser(auth: Pick<AuthTokenPayload, "email" | "role">) {
  if (!isEnvSuperadminAuth(auth)) return null;

  let superadmin = await User.findOne({ email: SUPERUSER_EMAIL });

  if (!superadmin) {
    const hashed = hashPassword(SUPERUSER_PASSWORD);
    superadmin = await User.create({
      name: SUPERADMIN_DISPLAY_NAME,
      email: SUPERUSER_EMAIL,
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      role: "superadmin",
    });
  } else {
    let didChange = false;

    if (superadmin.role !== "superadmin") {
      superadmin.role = "superadmin";
      didChange = true;
    }

    if (!superadmin.name?.trim()) {
      superadmin.name = SUPERADMIN_DISPLAY_NAME;
      didChange = true;
    }

    if (didChange) {
      await superadmin.save();
    }
  }

  const now = Date.now();
  const shouldEnforceRoles =
    now - superadminCheckCache.lastRunAt >= SUPERADMIN_ENFORCEMENT_INTERVAL_MS ||
    superadminCheckCache.hadRecentDemotion;

  if (shouldEnforceRoles) {
    const demotionResult = await User.updateMany(
      { role: "superadmin", _id: { $ne: superadmin._id } },
      { $set: { role: "admin" } }
    );

    superadminCheckCache.lastRunAt = now;
    superadminCheckCache.hadRecentDemotion = (demotionResult.modifiedCount ?? 0) > 0;
  }

  return superadmin;
}

export async function resolveAuthUserId(auth: AuthTokenPayload) {
  if (isValidMongoObjectId(auth.userId)) {
    return auth.userId;
  }

  const envSuperadmin = await ensureEnvSuperadminUser(auth);
  if (envSuperadmin) {
    return String(envSuperadmin._id);
  }

  const user = await User.findOne({ email: auth.email.trim().toLowerCase() }).select("_id");
  return user ? String(user._id) : null;
}
