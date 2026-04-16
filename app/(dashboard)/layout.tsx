import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { getServerAuthOrRedirect } from "@/lib/auth.server";
import { normalizeSidebarBranding } from "@/lib/sidebar-branding";
import { DEFAULT_THEME, THEME_COOKIE_NAME } from "@/lib/theme";
import type { Language } from "@/lib/language";
import { getCurrentUserProfileSnapshot } from "@/lib/user-profile.server";

export const metadata = {
  title: "Dashboard | Salt Mill",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const auth = await getServerAuthOrRedirect();
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get(THEME_COOKIE_NAME)?.value === "dark" ? "dark" : DEFAULT_THEME;
  const initialLanguage = (cookieStore.get("salt-mill-language")?.value as Language) === "bn" ? "bn" : "en";
  const profile = await getCurrentUserProfileSnapshot(auth);
  const initialBranding = normalizeSidebarBranding(profile);

  return (
    <div className="dashboard-shell min-h-screen text-slate-900">
      <div className="min-h-screen">
        <Sidebar initialTheme={initialTheme} initialBranding={initialBranding} />

        <div className="dashboard-main min-h-screen min-w-0 overflow-x-hidden w-full lg:pl-[250px]">
          <Navbar
            initialLanguage={initialLanguage}
            initialProfile={{
              name: profile.name,
              email: profile.email,
              role: profile.role,
              avatarUrl: profile.avatarUrl,
            }}
          />
          <main className="dashboard-content min-h-screen overflow-x-hidden px-3 pb-6 pt-20 sm:px-5 md:px-4 lg:p-4 lg:pt-24">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
