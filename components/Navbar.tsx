"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlainImage from "@/components/PlainImage";
import ThemeToggle from "@/components/ThemeToggle";
import { translate, type Language } from "@/lib/language";
import { useLanguage } from "@/lib/useLanguage";

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%230ea5e9'/%3E%3Cpath d='M60 64c13.255 0 24-10.745 24-24S73.255 16 60 16 36 26.745 36 40s10.745 24 24 24zm0 8c-16.569 0-30 13.431-30 30v2h60v-2c0-16.569-13.431-30-30-30z' fill='white'/%3E%3C/svg%3E";

type ProfileInfo = {
  name: string;
  email: string;
  role: "admin" | "superadmin";
  avatarUrl: string;
};

type MenuItem = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

const iconClassName = "h-[18px] w-[18px] text-slate-500";

type NavbarProps = {
  initialLanguage: Language;
};

export default function Navbar({ initialLanguage }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const { language, setLanguage: setStoredLanguage } = useLanguage(initialLanguage);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

  const profileName = useMemo(() => {
    if (profile?.name?.trim()) return profile.name.trim();
    if (profile?.email) return profile.email.split("@")[0];
    return "Admin User";
  }, [profile]);

  const roleLabel = useMemo(() => {
    if (profile?.role === "superadmin") return translate(language, "adminHead");
    return translate(language, "admin");
  }, [language, profile]);

  const pageTitle = useMemo(() => {
    if (pathname.startsWith("/transactions")) return translate(language, "transactions");
    if (pathname.startsWith("/suppliers")) return translate(language, "suppliers");
    if (pathname.startsWith("/customers")) return translate(language, "customers");
    if (pathname.startsWith("/stock")) return translate(language, "stock");
    if (pathname.startsWith("/settings")) return translate(language, "settings");
    return translate(language, "dashboard");
  }, [language, pathname]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/profile", { cache: "no-store" });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      setAvatarUrl(String(data?.avatarUrl ?? ""));
      setProfile({
        name: String(data?.name ?? ""),
        email: String(data?.email ?? ""),
        role: data?.role === "superadmin" ? "superadmin" : "admin",
        avatarUrl: String(data?.avatarUrl ?? ""),
      });
    } catch {
      // Swallow network errors and keep current avatar state.
    }
  }, [router]);

  useEffect(() => {
    const refreshProfile = () => {
      void loadProfile();
    };

    const timeoutId = window.setTimeout(refreshProfile, 0);
    window.addEventListener("profile-updated", refreshProfile);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("profile-updated", refreshProfile);
    };
  }, [loadProfile]);

  const handleLanguageChange = (nextLanguage: Language) => {
    setStoredLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(target)) {
        setLanguageMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network failures and still navigate out.
    }
    setAvatarUrl("");
    setMenuOpen(false);
    router.push("/login");
  };

  const openSettings = () => {
    setMenuOpen(false);
    router.push("/settings");
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new Event("toggle-sidebar"));
  };

  const menuTopItems: MenuItem[] = [
    {
      label: translate(language, "settingsLabel"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z" />
          <path d="m19 12 .9-1.5-1.8-3.1-1.8.5a6.7 6.7 0 0 0-1.3-.8L14.7 5h-3.4l-.3 2.1c-.4.2-.9.4-1.3.8l-1.8-.5L6 10.5 7 12l-1 1.5 1.8 3.1 1.8-.5c.4.3.8.6 1.3.8l.3 2.1h3.4l.3-2.1c.4-.2.9-.4 1.3-.8l1.8.5 1.8-3.1-1-.5Z" />
        </svg>
      ),
      onClick: openSettings,
    },
  ];

  const menuBottomItems: MenuItem[] = [
    {
      label: translate(language, "logout"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
          <path d="m14 16 4-4-4-4" />
          <path d="M18 12h-8" />
        </svg>
      ),
      onClick: logout,
    },
  ];

  return (
    <div className="navbar-shell fixed left-0 right-0 top-0 z-30 flex items-center justify-between bg-white px-4 py-3 shadow-sm sm:px-6 lg:left-72">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </button>
        <h1 className="truncate font-bold text-slate-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={languageMenuRef}>
          <button
            type="button"
            onClick={() => setLanguageMenuOpen((open) => !open)}
            className="theme-toggle-button light-navbar-button inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label={translate(language, "changeLanguage")}
            aria-expanded={languageMenuOpen}
          >
            <span>{language === "en" ? "EN" : "BD"}</span>
            <svg
              className={`ml-2 h-4 w-4 text-slate-500 transition-transform dark:text-slate-400 ${languageMenuOpen ? "rotate-180" : "rotate-0"}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5.2 7.7a.75.75 0 0 1 1.06 0L10 11.44l3.74-3.73a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.77a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>

          {languageMenuOpen ? (
            <div className="absolute right-0 z-20 mt-2 overflow-hidden w-full rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className="theme-toggle-button light-navbar-button flex w-full items-center justify-center px-3 py-2 text-left text-base text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>EN</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("bn")}
                className="theme-toggle-button light-navbar-button flex w-full items-center justify-center px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>BD</span>
              </button>
            </div>
          ) : null}
        </div>
        <ThemeToggle className="px-2.5 sm:px-3" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="profile-trigger-button light-navbar-button flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50"
          >
            <PlainImage
              src={avatarUrl || DEFAULT_AVATAR}
              alt="Admin avatar"
              className="profile-avatar h-9 w-9 rounded-full border border-slate-200 object-cover"
            />
            <div className="min-w-0 text-left">
              <p className="max-w-24 truncate text-sm font-medium leading-tight text-sky-700 sm:max-w-30">
                {profileName}
              </p>
              <p className="max-w-24 truncate text-xs leading-tight text-slate-500 sm:max-w-30">{roleLabel}</p>
            </div>
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : "rotate-0"}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5.2 7.7a.75.75 0 0 1 1.06 0L10 11.44l3.74-3.73a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.77a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white py-3 shadow-xl sm:w-full">
              <p className="px-4 text-base font-medium text-slate-700">{translate(language, "welcomeBack")}</p>

              <div className="mt-2 space-y-0.5 px-2">
                {menuTopItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="light-navbar-button flex w-full items-center gap-3 rounded-lg bg-white px-2.5 py-2.5 text-left text-[22px] text-slate-600 transition hover:bg-slate-50"
                  >
                    <span>{item.icon}</span>
                    <span className="text-[15px] leading-none">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="my-2 border-t border-slate-200" />

              <div className="space-y-0.5 px-2">
                {menuBottomItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="light-navbar-button flex w-full items-center gap-3 rounded-lg bg-white px-2.5 py-2.5 text-left text-[22px] text-slate-600 transition hover:bg-slate-50"
                  >
                    <span>{item.icon}</span>
                    <span className="text-[15px] leading-none">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
