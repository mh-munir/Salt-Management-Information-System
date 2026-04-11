import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";

const DEV_FALLBACK_JWT_SECRET = "dev-only-insecure-secret-change-me";
const rawJwtSecret = process.env.JWT_SECRET?.trim();

if (process.env.NODE_ENV === "production" && !rawJwtSecret) {
  throw new Error("JWT_SECRET must be configured in production.");
}

const JWT_SECRET = rawJwtSecret || DEV_FALLBACK_JWT_SECRET;

export const AUTH_COOKIE_NAME = "sms_auth";
export const AUTH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type UserRole = "superadmin" | "admin";

export type AuthTokenPayload = {
  userId?: string;
  email: string;
  role: UserRole;
};

type JwtPayloadLike = jwt.JwtPayload & AuthTokenPayload;

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string") return null;

    const parsed = decoded as JwtPayloadLike;
    if (!parsed.email || !parsed.role) return null;

    return {
      userId: parsed.userId,
      email: parsed.email,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) {
      return token;
    }
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === AUTH_COOKIE_NAME) {
      const value = valueParts.join("=");
      if (!value) return null;

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

export function getAuthFromRequest(request: Request): AuthTokenPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyAuthToken(token);
}

export function unauthorizedResponse(message = "Unauthorized"): Response {
  return Response.json({ message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden"): Response {
  return Response.json({ message }, { status: 403 });
}

export function requireAuth(request: Request, allowedRoles?: UserRole[]): AuthTokenPayload | Response {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse("Invalid or missing authentication.");
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return forbiddenResponse("You are not allowed to perform this action.");
  }

  return auth;
}

export function validateSameOrigin(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const origin = request.headers.get("origin");
  if (!origin) {
    return forbiddenResponse("Missing request origin.");
  }

  const requestUrl = new URL(request.url);
  const expectedOrigin = `${requestUrl.protocol}//${requestUrl.host}`;

  if (origin !== expectedOrigin) {
    return forbiddenResponse("Invalid request origin.");
  }

  return null;
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
}
