import { redirect } from "next/navigation";
import { getOptionalServerAuth } from "@/lib/auth.server";

export default async function HomePage() {
  const auth = await getOptionalServerAuth();

  if (auth) {
    redirect("/dashboard");
  }

  redirect("/login");
}
