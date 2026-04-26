import type { AuthTokenPayload } from "@/lib/auth";
import { connectDB, isMongoConnectionError, isValidMongoObjectId } from "@/lib/db";
import User from "@/models/User";
import {
  DEFAULT_BRAND_LOGO_URL,
  DEFAULT_BRAND_HEADING,
  DEFAULT_BRAND_SUBHEADING,
  type SidebarBrandingSnapshot,
  normalizeSidebarBranding,
} from "@/lib/sidebar-branding";

const emptySidebarBranding: SidebarBrandingSnapshot = {
  sidebarLogoUrl: DEFAULT_BRAND_LOGO_URL,
  sidebarHeading: DEFAULT_BRAND_HEADING,
  sidebarSubheading: DEFAULT_BRAND_SUBHEADING,
};

const SHARED_BRANDING_TIMEOUT_MS = 1500;
const SHARED_BRANDING_SUCCESS_TTL_MS = 60_000;
const SHARED_BRANDING_FAILURE_TTL_MS = 15_000;

type SharedSidebarBrandingCache = {
  value: SidebarBrandingSnapshot;
  expiresAt: number;
};

const globalForSharedSidebarBranding = globalThis as typeof globalThis & {
  sharedSidebarBrandingCache?: SharedSidebarBrandingCache;
};

const buildUserLookup = (userId: string | undefined, email: string) => {
  const filters: Array<{ _id?: string; email?: string }> = [{ email: email.toLowerCase() }];
  if (isValidMongoObjectId(userId)) {
    filters.unshift({ _id: userId });
  }

  return { $or: filters };
};

const SHARED_BRANDING_SELECT = "sidebarLogoUrl sidebarHeading sidebarSubheading updatedAt";

const hasCustomBranding = (user: {
  sidebarLogoUrl?: string | null;
  sidebarHeading?: string | null;
  sidebarSubheading?: string | null;
} | null) =>
  Boolean(
    user?.sidebarLogoUrl?.toString().trim() ||
      user?.sidebarHeading?.toString().trim() ||
      user?.sidebarSubheading?.toString().trim()
  );

const getCachedSharedSidebarBranding = () => {
  const cache = globalForSharedSidebarBranding.sharedSidebarBrandingCache;
  if (!cache) return null;
  if (Date.now() > cache.expiresAt) return null;
  return cache.value;
};

const setCachedSharedSidebarBranding = (value: SidebarBrandingSnapshot, ttlMs: number) => {
  globalForSharedSidebarBranding.sharedSidebarBrandingCache = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
};

async function loadSharedSidebarBrandingFromDb(): Promise<SidebarBrandingSnapshot> {
  await connectDB();

  const preferredSuperadmin = await User.findOne({
    role: "superadmin",
    $or: [
      { sidebarLogoUrl: { $exists: true, $ne: "" } },
      { sidebarHeading: { $exists: true, $ne: "" } },
      { sidebarSubheading: { $exists: true, $ne: "" } },
    ],
  })
    .sort({ updatedAt: -1, _id: -1 })
    .select(SHARED_BRANDING_SELECT)
    .lean();

  if (hasCustomBranding(preferredSuperadmin)) {
    return normalizeSidebarBranding(preferredSuperadmin);
  }

  const preferredAnyAdmin = await User.findOne({
    role: { $in: ["admin", "superadmin"] },
    $or: [
      { sidebarLogoUrl: { $exists: true, $ne: "" } },
      { sidebarHeading: { $exists: true, $ne: "" } },
      { sidebarSubheading: { $exists: true, $ne: "" } },
    ],
  })
    .sort({ updatedAt: -1, _id: -1 })
    .select(SHARED_BRANDING_SELECT)
    .lean();

  if (hasCustomBranding(preferredAnyAdmin)) {
    return normalizeSidebarBranding(preferredAnyAdmin);
  }

  return emptySidebarBranding;
}

export async function getSharedSidebarBrandingSnapshot(): Promise<SidebarBrandingSnapshot> {
  const cached = getCachedSharedSidebarBranding();
  if (cached) {
    return cached;
  }

  try {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const branding = await Promise.race<SidebarBrandingSnapshot>([
      loadSharedSidebarBrandingFromDb(),
      new Promise<SidebarBrandingSnapshot>((resolve) => {
        timeoutId = setTimeout(() => resolve(emptySidebarBranding), SHARED_BRANDING_TIMEOUT_MS);
      }),
    ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setCachedSharedSidebarBranding(
      branding,
      branding === emptySidebarBranding ? SHARED_BRANDING_FAILURE_TTL_MS : SHARED_BRANDING_SUCCESS_TTL_MS
    );
    return branding;
  } catch (error) {
    if (isMongoConnectionError(error)) {
      setCachedSharedSidebarBranding(emptySidebarBranding, SHARED_BRANDING_FAILURE_TTL_MS);
      return emptySidebarBranding;
    }

    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`Shared sidebar branding unavailable, using defaults: ${reason}`);
    setCachedSharedSidebarBranding(emptySidebarBranding, SHARED_BRANDING_FAILURE_TTL_MS);
    return emptySidebarBranding;
  }
}

export async function getSidebarBrandingSnapshot(
  auth: AuthTokenPayload | null
): Promise<SidebarBrandingSnapshot> {
  if (!auth) return emptySidebarBranding;

  try {
    await connectDB();

    const sharedBranding = await getSharedSidebarBrandingSnapshot();
    if (sharedBranding) return sharedBranding;

    const user = await User.findOne(buildUserLookup(auth.userId, auth.email)).select(
      "sidebarLogoUrl sidebarHeading sidebarSubheading"
    );

    if (!user) return emptySidebarBranding;

    return normalizeSidebarBranding({
      sidebarLogoUrl: user.sidebarLogoUrl,
      sidebarHeading: user.sidebarHeading,
      sidebarSubheading: user.sidebarSubheading,
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return emptySidebarBranding;
    }

    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`Sidebar branding unavailable, using defaults: ${reason}`);
    return emptySidebarBranding;
  }
}
