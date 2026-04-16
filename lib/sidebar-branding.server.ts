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

export async function getSharedSidebarBrandingSnapshot(): Promise<SidebarBrandingSnapshot> {
  try {
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
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return emptySidebarBranding;
    }

    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`Shared sidebar branding unavailable, using defaults: ${reason}`);
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
