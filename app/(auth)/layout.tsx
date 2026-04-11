import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
