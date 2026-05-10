import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError, parseJsonBody } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { connectDB } from "@/lib/db";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_MAX_AGE_SECONDS,
  signAuthToken,
  validateSameOrigin,
  verifyPassword,
} from "@/lib/auth";
import { sanitizeTextInput } from "@/lib/input-sanitization";
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
const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

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
    return apiError("Too many login attempts. Please wait and try again.", 429, { code: "rate_limited" });
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
  try {
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const rateLimitResponse = checkRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const parsedBody = await parseJsonBody(req, loginSchema);
    if (!parsedBody.success) return parsedBody.response;

    const normalizedEmail = sanitizeTextInput(parsedBody.data.email, { maxLength: 120 }).toLowerCase();
    const rawPassword = String(parsedBody.data.password);

    const normalizeSuccessResponse = (token: string, user: { email: string; role: string; avatarUrl: string }) => {
      clearRateLimit(req);

      const response = NextResponse.json({
        success: true,
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
      return apiError("Server auth is misconfigured. Configure SUPERUSER_EMAIL and SUPERUSER_PASSWORD.", 500, {
        code: "auth_misconfigured",
      });
    }

    const isBootstrapLogin =
      isSuperuserBootstrapConfigured &&
      normalizedEmail === SUPERUSER_EMAIL &&
      rawPassword === SUPERUSER_PASSWORD;

    await connectDB();

    if (isBootstrapLogin) {
      const superAdminUser = await ensureEnvSuperadminUser({
        email: normalizedEmail,
        role: "superadmin",
      });

      if (!superAdminUser) {
        logActivity({
          action: "auth.login",
          actorEmail: normalizedEmail,
          actorRole: "superadmin",
          status: "failure",
          metadata: { reason: "bootstrap_resolution_failed" },
        });
        return apiError("Super admin bootstrap is not configured correctly.", 500, { code: "bootstrap_error" });
      }

      await User.updateOne(
        { _id: superAdminUser._id },
        { $set: { lastLoginAt: new Date() } },
        { strict: false }
      );

      logActivity({
        action: "auth.login",
        actorId: String(superAdminUser._id),
        actorEmail: superAdminUser.email,
        actorRole: superAdminUser.role,
      });

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
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      logActivity({
        action: "auth.login",
        actorEmail: normalizedEmail,
        status: "failure",
        metadata: { reason: "user_not_found" },
      });
      return apiError("Invalid email or password.", 401, { code: "invalid_credentials" });
    }

    const isValidPassword = verifyPassword(rawPassword, user.passwordHash, user.passwordSalt);
    if (!isValidPassword) {
      logActivity({
        action: "auth.login",
        actorId: String(user._id),
        actorEmail: user.email,
        actorRole: user.role,
        status: "failure",
        metadata: { reason: "invalid_password" },
      });
      return apiError("Invalid email or password.", 401, { code: "invalid_credentials" });
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } },
      { strict: false }
    );

    logActivity({
      action: "auth.login",
      actorId: String(user._id),
      actorEmail: user.email,
      actorRole: user.role,
    });

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
  } catch (error) {
    return handleRouteError(error, { route: "/api/auth/login" });
  }
}
