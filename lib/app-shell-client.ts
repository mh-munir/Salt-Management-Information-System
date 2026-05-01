"use client";

export type AppShellSnapshot = {
  name: string;
  email: string;
  role: "admin" | "superadmin";
  avatarUrl: string;
  faviconUrl: string;
  siteTitle: string;
  sidebarLogoUrl: string;
  sidebarHeading: string;
  sidebarSubheading: string;
};

const APP_SHELL_CACHE_TTL_MS = 3_000;

let cachedSnapshot: AppShellSnapshot | null = null;
let cachedAt = 0;
let inflightRequest: Promise<AppShellSnapshot> | null = null;

export async function fetchAppShellSnapshot(options?: { force?: boolean }): Promise<AppShellSnapshot> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force && cachedSnapshot && now - cachedAt < APP_SHELL_CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = fetch("/api/app-shell", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        const error = new Error(`Unable to load app shell snapshot (${response.status})`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const snapshot = (await response.json()) as AppShellSnapshot;
      cachedSnapshot = snapshot;
      cachedAt = Date.now();
      return snapshot;
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}
