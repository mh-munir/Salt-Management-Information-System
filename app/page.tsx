import { redirect } from "next/navigation";
import { getOptionalServerAuth } from "@/lib/auth.server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function HomePage() {
  const auth = await getOptionalServerAuth();

  if (auth) {
    redirect("/dashboard");
  }

  redirect("/login");
}
