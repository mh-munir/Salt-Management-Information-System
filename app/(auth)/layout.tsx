import type { ReactNode } from "react";
import { redirectIfAuthenticated } from "@/lib/auth.server";

export default async function AuthGroupLayout({ children }: { children: ReactNode }) {
  await redirectIfAuthenticated("/dashboard");
  return <>{children}</>;
}
