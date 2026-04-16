import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, type AuthTokenPayload, verifyAuthToken } from "@/lib/auth";

export async function getOptionalServerAuth(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
}

export async function getServerAuthOrRedirect(redirectTo = "/login"): Promise<AuthTokenPayload> {
  const auth = await getOptionalServerAuth();

  if (!auth) {
    redirect(redirectTo);
  }

  return auth;
}

export async function redirectIfAuthenticated(destination = "/dashboard") {
  const auth = await getOptionalServerAuth();

  if (auth) {
    redirect(destination);
  }
}
