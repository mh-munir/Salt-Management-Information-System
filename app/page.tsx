import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;

  if (auth) {
    redirect("/dashboard");
  }

  redirect("/login");
}
