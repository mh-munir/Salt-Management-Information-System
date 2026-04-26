import { connectDB, isMongoConnectionError } from "@/lib/db";
import {
  DEFAULT_FAVICON_URL,
  DEFAULT_SITE_TITLE,
  type SiteSettingsSnapshot,
  normalizeSiteSettings,
} from "@/lib/site-settings";
import User from "@/models/User";

const emptySiteSettings: SiteSettingsSnapshot = {
  faviconUrl: DEFAULT_FAVICON_URL,
  siteTitle: DEFAULT_SITE_TITLE,
};

const SHARED_SITE_SETTINGS_SELECT = "faviconUrl siteTitle updatedAt";
const SHARED_SITE_SETTINGS_TIMEOUT_MS = 1500;
const SHARED_SITE_SETTINGS_SUCCESS_TTL_MS = 60_000;
const SHARED_SITE_SETTINGS_FAILURE_TTL_MS = 15_000;

type SharedSiteSettingsCache = {
  value: SiteSettingsSnapshot;
  expiresAt: number;
};

const globalForSharedSiteSettings = globalThis as typeof globalThis & {
  sharedSiteSettingsCache?: SharedSiteSettingsCache;
};

const hasCustomSiteSettings = (user: { faviconUrl?: string | null; siteTitle?: string | null } | null) =>
  Boolean(user?.faviconUrl?.toString().trim() || user?.siteTitle?.toString().trim());

const getCachedSharedSiteSettings = () => {
  const cache = globalForSharedSiteSettings.sharedSiteSettingsCache;
  if (!cache) return null;
  if (Date.now() > cache.expiresAt) return null;
  return cache.value;
};

const setCachedSharedSiteSettings = (value: SiteSettingsSnapshot, ttlMs: number) => {
  globalForSharedSiteSettings.sharedSiteSettingsCache = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
};

async function loadSharedSiteSettingsFromDb(): Promise<SiteSettingsSnapshot> {
  await connectDB();

  const preferredSuperadmin = await User.findOne({
    role: "superadmin",
    $or: [{ faviconUrl: { $exists: true, $ne: "" } }, { siteTitle: { $exists: true, $ne: "" } }],
  })
    .sort({ updatedAt: -1, _id: -1 })
    .select(SHARED_SITE_SETTINGS_SELECT)
    .lean();

  if (hasCustomSiteSettings(preferredSuperadmin)) {
    return normalizeSiteSettings(preferredSuperadmin);
  }

  const preferredAnyAdmin = await User.findOne({
    role: { $in: ["admin", "superadmin"] },
    $or: [{ faviconUrl: { $exists: true, $ne: "" } }, { siteTitle: { $exists: true, $ne: "" } }],
  })
    .sort({ updatedAt: -1, _id: -1 })
    .select(SHARED_SITE_SETTINGS_SELECT)
    .lean();

  if (hasCustomSiteSettings(preferredAnyAdmin)) {
    return normalizeSiteSettings(preferredAnyAdmin);
  }

  return emptySiteSettings;
}

export async function getSharedSiteSettingsSnapshot(): Promise<SiteSettingsSnapshot> {
  const cached = getCachedSharedSiteSettings();
  if (cached) {
    return cached;
  }

  try {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const settings = await Promise.race<SiteSettingsSnapshot>([
      loadSharedSiteSettingsFromDb(),
      new Promise<SiteSettingsSnapshot>((resolve) => {
        timeoutId = setTimeout(() => resolve(emptySiteSettings), SHARED_SITE_SETTINGS_TIMEOUT_MS);
      }),
    ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setCachedSharedSiteSettings(
      settings,
      settings === emptySiteSettings ? SHARED_SITE_SETTINGS_FAILURE_TTL_MS : SHARED_SITE_SETTINGS_SUCCESS_TTL_MS
    );
    return settings;
  } catch (error) {
    if (isMongoConnectionError(error)) {
      setCachedSharedSiteSettings(emptySiteSettings, SHARED_SITE_SETTINGS_FAILURE_TTL_MS);
      return emptySiteSettings;
    }

    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`Shared site settings unavailable, using defaults: ${reason}`);
    setCachedSharedSiteSettings(emptySiteSettings, SHARED_SITE_SETTINGS_FAILURE_TTL_MS);
    return emptySiteSettings;
  }
}
