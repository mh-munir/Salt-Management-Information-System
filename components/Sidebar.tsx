"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PlainImage from "@/components/PlainImage";
import {
  DEFAULT_BRAND_LOGO_URL,
  DEFAULT_BRAND_HEADING,
  DEFAULT_BRAND_SUBHEADING,
  loadStoredSidebarBranding,
  normalizeSidebarBranding,
  type SidebarBrandingSnapshot,
  saveStoredSidebarBranding,
} from "@/lib/sidebar-branding";
import { translate, type TranslationKey } from "@/lib/language";
import { useLanguage } from "@/lib/useLanguage";

type NavIconType = "dashboard" | "transactions" | "suppliers" | "customers" | "stock" | "cost" | "settings";

type NavItem = {
  href: string;
  label: TranslationKey;
  icon: NavIconType;
};

type NavGroup = {
  title: TranslationKey;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "main",
    items: [
      { href: "/dashboard", label: "dashboard", icon: "dashboard" },
      { href: "/transactions", label: "transactions", icon: "transactions" },
    ],
  },
  {
    title: "management",
    items: [
      { href: "/suppliers", label: "suppliers", icon: "suppliers" },
      { href: "/customers", label: "customers", icon: "customers" },
      { href: "/stock", label: "stock", icon: "stock" },
      { href: "/cost", label: "cost", icon: "cost" },
    ],
  },
  {
    title: "system",
    items: [{ href: "/settings", label: "settings", icon: "settings" }],
  },
];

const iconClassName = "h-6 w-6 shrink-0";

type SidebarBrandingResponse = {
  sidebarLogoUrl?: string;
  sidebarHeading?: string;
  sidebarSubheading?: string;
  name?: string;
  role?: "admin" | "superadmin";
  avatarUrl?: string;
};

type SidebarBrandingUpdateDetail = {
  sidebarLogoUrl?: string;
  sidebarHeading?: string;
  sidebarSubheading?: string;
};

function NavIcon({ type }: { type: NavIconType }) {
  if (type === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={iconClassName}>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
        <rect x="13" y="3.5" width="7.5" height="4.8" rx="1.2" />
        <rect x="13" y="10.6" width="7.5" height="9.9" rx="1.2" />
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" />
      </svg>
    );
  }

  if (type === "transactions") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={iconClassName}>
        <path d="M4 8h12" />
        <path d="m12 4 4 4-4 4" />
        <path d="M20 16H8" />
        <path d="m12 12-4 4 4 4" />
      </svg>
    );
  }

  if (type === "suppliers") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={iconClassName}>
        <path d="M3.2 10.7 12 4.2l8.8 6.5v9.6a1 1 0 0 1-1 1H4.2a1 1 0 0 1-1-1v-9.6Z" />
        <path d="M9 21.3v-6h6v6" />
      </svg>
    );
  }

  if (type === "customers") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={iconClassName}>
        <circle cx="8.8" cy="8.6" r="2.8" />
        <path d="M3.8 17c1.1-2.3 2.8-3.5 5-3.5 2.1 0 3.8 1.2 4.9 3.5" />
        <circle cx="17.4" cy="9.4" r="2.1" />
        <path d="M14.7 16.7c.8-1.6 1.9-2.4 3.5-2.4 1.5 0 2.6.8 3.4 2.4" />
      </svg>
    );
  }

  if (type === "stock") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={iconClassName}>
        <path d="M4 7h16" />
        <path d="M6 7V4.9h12V7" />
        <rect x="4.4" y="7" width="15.2" height="12.8" rx="1.3" />
        <path d="M9 12h6" />
      </svg>
    );
  }

  if (type === "cost") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={iconClassName}>
        <path d="M5 6.5h14" />
        <path d="M8 4v5" />
        <path d="M16 4v5" />
        <rect x="4" y="6.5" width="16" height="13.5" rx="1.5" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={iconClassName}>
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
      <path d="m19.1 12 .9-1.4-1.8-3-1.7.4c-.4-.3-.8-.5-1.2-.7l-.4-2h-3.7l-.3 2c-.5.2-.9.4-1.3.7l-1.7-.4-1.8 3 .9 1.4-.9 1.4 1.8 3 1.7-.4c.4.3.8.5 1.3.7l.3 2h3.7l.4-2c.4-.2.8-.4 1.2-.7l1.7.4 1.8-3-.9-1.4Z" />
    </svg>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="sidebarBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path d="M20 3 24 12 33 16 24 20 20 29 16 20 7 16 16 12Z" fill="url(#sidebarBrandGradient)" />
      <path d="M20 11 22 15 26 17 22 19 20 23 18 19 14 17 18 15Z" fill="#c4b5fd" />
    </svg>
  );
}

type SidebarProps = {
  initialBranding?: SidebarBrandingSnapshot;
  initialTheme?: "light" | "dark";
};

export default function Sidebar({
  initialBranding = {
    sidebarLogoUrl: DEFAULT_BRAND_LOGO_URL,
    sidebarHeading: DEFAULT_BRAND_HEADING,
    sidebarSubheading: DEFAULT_BRAND_SUBHEADING,
  },
  initialTheme = "light",
}: SidebarProps) {
  const pathname = usePathname();
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState(initialBranding.sidebarLogoUrl);
  const [sidebarHeading, setSidebarHeading] = useState(initialBranding.sidebarHeading);
  const [sidebarSubheading, setSidebarSubheading] = useState(initialBranding.sidebarSubheading);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const { language } = useLanguage();

  const loadBranding = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/profile", { cache: "no-store" });
      if (!res.ok) return;

      const data: SidebarBrandingResponse = await res.json();
      const branding = normalizeSidebarBranding(data);
      setSidebarLogoUrl(branding.sidebarLogoUrl);
      setSidebarHeading(branding.sidebarHeading);
      setSidebarSubheading(branding.sidebarSubheading);
      saveStoredSidebarBranding(branding);
    } catch {
      // Keep default branding if the request fails.
    }
  }, []);

  useEffect(() => {
    const refreshBranding = () => {
      void loadBranding();
    };

    const handleBrandingUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<SidebarBrandingUpdateDetail>;
      const detail = normalizeSidebarBranding(customEvent.detail);
      setSidebarLogoUrl(detail.sidebarLogoUrl);
      setSidebarHeading(detail.sidebarHeading);
      setSidebarSubheading(detail.sidebarSubheading);
      saveStoredSidebarBranding(detail);
    };

    const handleStorage = () => {
      const detail = loadStoredSidebarBranding();
      setSidebarLogoUrl(detail.sidebarLogoUrl);
      setSidebarHeading(detail.sidebarHeading);
      setSidebarSubheading(detail.sidebarSubheading);
    };

    const handleToggleSidebar = () => {
      setMobileOpen((current) => !current);
    };

    const handleCloseSidebar = () => {
      setMobileOpen(false);
    };

    saveStoredSidebarBranding(initialBranding);
    refreshBranding();
    window.addEventListener("profile-updated", refreshBranding);
    window.addEventListener("sidebar-branding-updated", handleBrandingUpdated as EventListener);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("toggle-sidebar", handleToggleSidebar);
    window.addEventListener("close-sidebar", handleCloseSidebar);

    return () => {
      window.removeEventListener("profile-updated", refreshBranding);
      window.removeEventListener("sidebar-branding-updated", handleBrandingUpdated as EventListener);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("toggle-sidebar", handleToggleSidebar);
      window.removeEventListener("close-sidebar", handleCloseSidebar);
    };
  }, [initialBranding, loadBranding]);

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      setTheme(nextTheme);
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    window.addEventListener("storage", syncTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const isDarkTheme = theme === "dark";

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] transition lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`sidebar-shell fixed inset-y-0 left-0 z-50 max-w-[22rem] overflow-y-auto transition-transform duration-300 lg:z-40 w-[250px] lg:shadow-none lg:translate-x-0 ${
          isDarkTheme
            ? "bg-[#1F2128] text-slate-100 shadow-[18px_0_42px_rgba(15,23,42,0.28)] lg:border-r lg:border-slate-700/60"
            : "bg-[#ffffff] text-slate-800 shadow-[18px_0_42px_rgba(148,163,184,0.18)] lg:border-r lg:border-slate-200"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div
        className={`flex items-center border-b px-5 py-5 lg:hidden lg:px-6 lg:py-5 ${
          isDarkTheme ? "border-white/10 lg:border-indigo-900/50" : "border-slate-200"
        }`}
      >
        <span className={`text-xs font-bold uppercase tracking-[0.3em] lg:hidden ${isDarkTheme ? "text-white/45" : "text-slate-500"}`}>{translate(language, "menu")}</span>
      </div>

      <div className={`border-b px-5 py-3 lg:block lg:px-6 ${isDarkTheme ? "border-indigo-900/50" : "border-slate-200"}`}>
          <div className="space-y-1 flex flex-col items-center ">
            <div className="flex flex-col items-center gap-2 mb-2">
              {sidebarLogoUrl ? (
                <PlainImage
                  src={sidebarLogoUrl}
                  alt="Sidebar logo"
                  className="h-auto w-28 object-contain sm:w-32"
                />
              ) : (
                <BrandMark />
              )}
              <div className="min-w-0">
                <p
                  className={`text-sm md:text-center font-semibold leading-tight tracking-[-0.02em] sm:text-base ${isDarkTheme ? "text-white" : "text-slate-900"}`}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {sidebarHeading}
                </p>
              </div>
            </div>

            <p
              className={`text-xs uppercase tracking-[0.22em] ${isDarkTheme ? "text-indigo-300" : "text-slate-500"}`}
              style={{ overflowWrap: "anywhere" }}
            >
              {sidebarSubheading}
            </p>
          </div>
      </div>

      <nav className="space-y-6 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-8 lg:px-4 lg:py-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p
              className={`px-1 text-xs font-bold uppercase tracking-[0.22em] lg:px-2 lg:tracking-[0.18em] ${
                isDarkTheme ? "text-white/40 lg:text-indigo-300/70" : "text-slate-500"
              }`}
            >
              {translate(language, group.title)}
            </p>

            <div className="mt-3 space-y-1 lg:space-y-1.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center gap-2 rounded-2xl px-3 py-3 text-[0.98rem] font-medium transition sm:px-3.5 sm:py-3.5 sm:text-base lg:rounded-xl lg:px-3.5 lg:py-3 lg:text-[1.05rem] ${
                      isDarkTheme
                        ? isActive
                          ? "bg-white/12 text-white lg:bg-indigo-700/30 lg:text-indigo-100 lg:shadow-[inset_0_0_0_1px_rgba(165,180,252,0.22)]"
                          : "text-white/78 hover:bg-white/8 hover:text-white lg:text-indigo-100/85 lg:hover:bg-indigo-800/25"
                        : isActive
                          ? "bg-white text-slate-900 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)]"
                          : "text-slate-700 hover:bg-white/80 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={
                        isDarkTheme
                          ? isActive
                            ? "text-white lg:text-indigo-200"
                            : "text-white/78 lg:text-indigo-300/85"
                          : isActive
                            ? "text-slate-900"
                            : "text-slate-500"
                      }
                    >
                      <NavIcon type={item.icon} />
                    </span>
                    <span className="flex-1">{translate(language, item.label)}</span>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 transition ${
                        isDarkTheme
                          ? isActive
                            ? "text-white lg:text-indigo-100"
                            : "text-white/55 group-hover:text-white lg:text-indigo-300/70 lg:group-hover:text-indigo-100"
                          : isActive
                            ? "text-slate-700"
                            : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    >
                      <path d="M7.3 4.8a.75.75 0 0 1 1.06 0l4.47 4.47a.75.75 0 0 1 0 1.06L8.36 14.8a.75.75 0 1 1-1.06-1.06L11.24 10 7.3 6.06a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      </aside>
    </>
  );
}
