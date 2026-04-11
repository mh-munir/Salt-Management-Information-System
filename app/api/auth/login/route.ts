import { NextResponse } from "next/server";
import { connectDB, isMongoConnectionError } from "@/lib/db";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_MAX_AGE_SECONDS,
  signAuthToken,
  validateSameOrigin,
  verifyPassword,
} from "@/lib/auth";
import { ensureEnvSuperadminUser } from "@/lib/superadmin";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const isProduction = process.env.NODE_ENV === "production";
const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL?.trim().toLowerCase() ?? "";
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD?.trim() ?? "";
const isSuperuserBootstrapConfigured = Boolean(SUPERUSER_EMAIL && SUPERUSER_PASSWORD);
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(request: Request): Response | null {
  const key = getClientIdentifier(request);
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (!existing || now > existing.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return null;
  }

  if (existing.count >= LOGIN_MAX_ATTEMPTS) {
    return Response.json(
      { message: "Too many login attempts. Please wait and try again." },
      { status: 429 }
    );
  }

  existing.count += 1;
  loginAttempts.set(key, existing);
  return null;
}

function clearRateLimit(request: Request) {
  const key = getClientIdentifier(request);
  loginAttempts.delete(key);
}

export async function POST(req: Request) {
  const originError = validateSameOrigin(req);
  if (originError) return originError;

  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const { email, password } = await req.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const rawPassword = String(password ?? "").trim();

  if (!normalizedEmail || !rawPassword) {
    return Response.json({ message: "Email and password are required." }, { status: 400 });
  }

  const normalizeSuccessResponse = (token: string, user: { email: string; role: string; avatarUrl: string }) => {
    clearRateLimit(req);

    const response = NextResponse.json({
      user,
    });
    response.headers.set("Cache-Control", "no-store");

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
    });

    return response;
  };

  if (isProduction && !isSuperuserBootstrapConfigured) {
    return Response.json(
      { message: "Server auth is misconfigured. Configure SUPERUSER_EMAIL and SUPERUSER_PASSWORD." },
      { status: 500 }
    );
  }

  if (
    isSuperuserBootstrapConfigured &&
    normalizedEmail === SUPERUSER_EMAIL &&
    rawPassword === SUPERUSER_PASSWORD
  ) {
    try {
      await connectDB();

      const superAdminUser = await ensureEnvSuperadminUser({
        email: normalizedEmail,
        role: "superadmin",
      });

      if (!superAdminUser) {
        return Response.json({ message: "Super admin bootstrap is not configured correctly." }, { status: 500 });
      }

      const token = signAuthToken({
        userId: String(superAdminUser._id),
        email: normalizedEmail,
        role: "superadmin",
      });

      return normalizeSuccessResponse(token, {
        email: superAdminUser.email,
        role: superAdminUser.role,
        avatarUrl: superAdminUser.avatarUrl ?? "",
      });
    } catch (error) {
      if (!isMongoConnectionError(error)) {
        throw error;
      }

      console.warn("MongoDB unavailable during superuser bootstrap login. Using token-only superadmin session.");

      const token = signAuthToken({
        email: normalizedEmail,
        role: "superadmin",
      });

      return normalizeSuccessResponse(token, {
        email: normalizedEmail,
        role: "superadmin",
        avatarUrl: "",
      });
    }
  }

  await connectDB();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return Response.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const isValidPassword = verifyPassword(rawPassword, user.passwordHash, user.passwordSalt);
  if (!isValidPassword) {
    return Response.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const token = signAuthToken({
    userId: String(user._id),
    email: user.email,
    role: user.role,
  });

  return normalizeSuccessResponse(token, {
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? "",
  });
}
