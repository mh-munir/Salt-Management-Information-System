import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getSidebarBrandingSnapshot } from "@/lib/sidebar-branding.server";
import { DEFAULT_THEME, THEME_COOKIE_NAME } from "@/lib/theme";
import type { Language } from "@/lib/language";

export const metadata = {
  title: "Dashboard | Salt Mill",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const initialTheme = cookieStore.get(THEME_COOKIE_NAME)?.value === "dark" ? "dark" : DEFAULT_THEME;
  const initialLanguage = (cookieStore.get("salt-mill-language")?.value as Language) === "bn" ? "bn" : "en";

  if (!auth) {
    redirect("/login");
  }

  const initialBranding = await getSidebarBrandingSnapshot(auth);

  return (
    <div className="dashboard-shell min-h-screen text-slate-900">
      <div className="min-h-screen">
        <Sidebar initialTheme={initialTheme} initialBranding={initialBranding} />

        <div className="dashboard-main min-h-screen min-w-0 lg:ml-72">
          <Navbar initialLanguage={initialLanguage} />
          <main className="dashboard-content min-h-screen min-w-0 px-3 pb-6 pt-20 sm:px-6 lg:p-6 lg:pt-24">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
