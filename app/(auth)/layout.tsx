import type { ReactNode } from "react";
import { redirectIfAuthenticated } from "@/lib/auth.server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AuthGroupLayout({ children }: { children: ReactNode }) {
  await redirectIfAuthenticated("/dashboard");
  return <>{children}</>;
}
