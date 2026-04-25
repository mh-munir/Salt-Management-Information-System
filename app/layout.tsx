import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Noto_Sans_Bengali } from "next/font/google";
import LanguageRootSync from "@/components/LanguageRootSync";
import LazyToaster from "@/components/LazyToaster";
import SiteFooter from "@/components/SiteFooter";
import type { Language } from "@/lib/language";
import { getSharedSiteSettingsSnapshot } from "@/lib/site-settings.server";
import { DEFAULT_THEME, THEME_COOKIE_NAME } from "@/lib/theme";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  preload: false,
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto-sans-bengali",
  preload: false,
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSharedSiteSettingsSnapshot();

  return {
    title: siteSettings.siteTitle,
    description: "Salt management dashboard and operations workspace.",
    icons: {
      icon: siteSettings.faviconUrl,
      shortcut: siteSettings.faviconUrl,
      apple: siteSettings.faviconUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get(THEME_COOKIE_NAME)?.value === "dark" ? "dark" : DEFAULT_THEME;
  const initialLanguage = (cookieStore.get("salt-mill-language")?.value as Language) === "bn" ? "bn" : "en";

  return (
    <html
      lang={initialLanguage}
      data-theme={initialTheme}
      data-language={initialLanguage}
      className={`${dmSans.variable} ${notoSansBengali.variable} ${initialTheme === "dark" ? "theme-dark" : "theme-light"} ${initialLanguage === "bn" ? "lang-bn" : "lang-en"}`}
      style={{ colorScheme: initialTheme }}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <LanguageRootSync initialLanguage={initialLanguage} />
        {children}
        <LazyToaster />
        <SiteFooter />
      </body>
    </html>
  );
}
