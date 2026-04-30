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
  description: string;
};

type NavGroup = {
  title: TranslationKey;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "main",
    items: [
      { href: "/dashboard", label: "dashboard", icon: "dashboard", description: "Overview and daily insights" },
      { href: "/transactions", label: "transactions", icon: "transactions", description: "Payment and ledger activity" },
    ],
  },
  {
    title: "management",
    items: [
      { href: "/suppliers", label: "suppliers", icon: "suppliers", description: "Vendor balances and purchases" },
      { href: "/customers", label: "customers", icon: "customers", description: "Client sales and due tracking" },
      { href: "/stock", label: "stock", icon: "stock", description: "Inventory position and movement" },
      { href: "/cost", label: "cost", icon: "cost", description: "Operational expense records" },
    ],
  },
  {
    title: "system",
    items: [{ href: "/settings", label: "settings", icon: "settings", description: "Branding, profile, and preferences" }],
  },
];

const iconClassName = "h-5 w-5 shrink-0";

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
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
      <defs>
        <linearGradient id="sidebarBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M20 3 24 12 33 16 24 20 20 29 16 20 7 16 16 12Z" fill="url(#sidebarBrandGradient)" />
      <path d="M20 11 22 15 26 17 22 19 20 23 18 19 14 17 18 15Z" fill="#bae6fd" />
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

      <div
        className={`border-b px-5 py-4 lg:block lg:px-6 ${
          isDarkTheme ? "border-slate-700/70" : "border-slate-200/90"
        }`}
      >
          <div className="flex flex-col items-center space-y-1">
            <div className="mb-2 flex flex-col items-center gap-3">
              {sidebarLogoUrl ? (
                <PlainImage
                  src={sidebarLogoUrl}
                  alt="Sidebar logo"
                  className="h-auto w-28 object-contain sm:w-32"
                />
              ) : (
                <div
                  className={`rounded-2xl border p-2.5 shadow-sm ${
                    isDarkTheme
                      ? "border-sky-400/15 bg-slate-900/80 shadow-sky-950/20"
                      : "border-sky-100 bg-sky-50/80 shadow-sky-100/80"
                  }`}
                >
                  <BrandMark />
                </div>
              )}
              <div className="min-w-0">
                <p
                  className={`text-center text-sm font-semibold leading-tight tracking-[-0.03em] sm:text-[1.02rem] ${
                    isDarkTheme ? "text-white" : "text-slate-900"
                  }`}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {sidebarHeading}
                </p>
              </div>
            </div>

            <p
              className={`rounded-lg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                isDarkTheme
                  ? "bg-slate-800/90 text-sky-200 ring-1 ring-slate-700/70"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
              }`}
              style={{ overflowWrap: "anywhere" }}
            >
              {sidebarSubheading}
            </p>
          </div>
      </div>

      <nav className="space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:px-4 lg:py-5">
        {navGroups.map((group) => (
          <div
            key={group.title}
            className={`relative overflow-hidden rounded-3xl border p-2.5 ${
              isDarkTheme
                ? "border-white/6 bg-linear-to-br from-white/[0.05] via-white/[0.03] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "border-slate-200/80 bg-linear-to-br from-white via-white to-slate-50/80 shadow-[0_14px_34px_rgba(148,163,184,0.10)] backdrop-blur-sm"
            }`}
          >
            <div
              className={`pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full blur-3xl ${
                isDarkTheme ? "bg-sky-400/10" : "bg-sky-200/50"
              }`}
            />
            <div className="flex items-center gap-2 px-2 pb-2">
              <span
                className={`h-px flex-1 ${
                  isDarkTheme ? "bg-gradient-to-r from-sky-300/35 to-transparent" : "bg-gradient-to-r from-sky-200 to-transparent"
                }`}
              />
              <p
                className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                  isDarkTheme ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {translate(language, group.title)}
              </p>
            </div>

            <div className="space-y-2">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-[1.45rem] px-3 py-3 text-[0.96rem] font-medium transition-all duration-300 sm:px-3.5 sm:py-3.5 lg:px-3.5 lg:py-3 ${
                      isDarkTheme
                        ? isActive
                          ? "bg-linear-to-r from-sky-500/24 via-blue-500/16 to-slate-900/12 text-white shadow-[0_16px_34px_rgba(8,47,73,0.34)] ring-1 ring-sky-300/12"
                          : "text-white/78 hover:bg-white/[0.08] hover:text-white"
                        : isActive
                          ? "bg-linear-to-r from-sky-50 via-white to-sky-50/80 text-slate-900 shadow-[0_18px_36px_rgba(148,163,184,0.18)] ring-1 ring-sky-100"
                          : "text-slate-700 hover:bg-white/95 hover:text-slate-900 hover:shadow-[0_12px_28px_rgba(148,163,184,0.13)]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ${
                        isActive
                          ? isDarkTheme
                            ? "bg-[radial-gradient(circle_at_right,rgba(125,211,252,0.14),transparent_42%)] opacity-100"
                            : "bg-[radial-gradient(circle_at_right,rgba(186,230,253,0.65),transparent_42%)] opacity-100"
                          : "group-hover:opacity-100"
                      }`}
                    />
                    <span
                      className={`absolute inset-y-2 left-0 w-1 rounded-r-full transition-all duration-200 ${
                        isActive
                          ? isDarkTheme
                            ? "bg-sky-300 opacity-100"
                            : "bg-sky-500 opacity-100"
                          : "opacity-0 group-hover:opacity-60"
                      }`}
                    />
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${
                        isDarkTheme
                          ? isActive
                            ? "border-sky-300/18 bg-slate-900/85 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                            : "border-transparent bg-white/[0.07] text-white/78 group-hover:bg-white/[0.12] group-hover:text-white"
                          : isActive
                            ? "border-sky-100 bg-linear-to-br from-sky-50 to-white text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                            : "border-transparent bg-slate-100/85 text-slate-500 group-hover:bg-slate-200/85 group-hover:text-slate-700"
                      }`}
                    >
                      <NavIcon type={item.icon} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block leading-tight tracking-[-0.02em] ${
                          isActive ? "font-semibold" : ""
                        }`}
                      >
                        {translate(language, item.label)}
                      </span>
                      <span
                        className={`mt-1 block truncate text-[11px] font-medium leading-tight ${
                          isDarkTheme
                            ? isActive
                              ? "text-white/70"
                              : "text-white/42 group-hover:text-white/62"
                            : isActive
                              ? "text-slate-500"
                              : "text-slate-400 group-hover:text-slate-500"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
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
