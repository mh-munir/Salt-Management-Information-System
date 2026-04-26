import type { AuthTokenPayload, UserRole } from "@/lib/auth";
import { connectDB, isMongoConnectionError, isValidMongoObjectId } from "@/lib/db";
import { DEFAULT_FAVICON_URL, DEFAULT_SITE_TITLE } from "@/lib/site-settings";
import { getSharedSiteSettingsSnapshot } from "@/lib/site-settings.server";
import { ensureEnvSuperadminUser } from "@/lib/superadmin";
import { getSharedSidebarBrandingSnapshot } from "@/lib/sidebar-branding.server";
import User from "@/models/User";

export type UserProfileSnapshot = {
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  faviconUrl: string;
  siteTitle: string;
  sidebarLogoUrl: string;
  sidebarHeading: string;
  sidebarSubheading: string;
};

const buildUserLookup = (userId: string | undefined, email: string) => {
  const filters: Array<{ _id?: string; email?: string }> = [{ email: email.toLowerCase() }];
  if (isValidMongoObjectId(userId)) {
    filters.unshift({ _id: userId });
  }

  return { $or: filters };
};

const createFallbackProfile = (
  auth: Pick<AuthTokenPayload, "email" | "role">,
  branding: Pick<UserProfileSnapshot, "sidebarLogoUrl" | "sidebarHeading" | "sidebarSubheading">,
  siteSettings: Pick<UserProfileSnapshot, "faviconUrl" | "siteTitle">
): UserProfileSnapshot => ({
  name: auth.role === "superadmin" ? "Super Admin" : "",
  email: auth.email,
  role: auth.role,
  avatarUrl: "",
  faviconUrl: siteSettings.faviconUrl,
  siteTitle: siteSettings.siteTitle,
  sidebarLogoUrl: branding.sidebarLogoUrl,
  sidebarHeading: branding.sidebarHeading,
  sidebarSubheading: branding.sidebarSubheading,
});

export async function getCurrentUserProfileSnapshot(
  auth: AuthTokenPayload
): Promise<UserProfileSnapshot> {
  try {
    await connectDB();

    let [user] = await Promise.all([
      User.findOne(buildUserLookup(auth.userId, auth.email)).select(
        "name email role avatarUrl sidebarLogoUrl sidebarHeading sidebarSubheading faviconUrl siteTitle"
      ),
    ]);
    const [sharedBranding, sharedSiteSettings] = await Promise.all([
      getSharedSidebarBrandingSnapshot(),
      getSharedSiteSettingsSnapshot(),
    ]);

    if (!user) {
      user = await ensureEnvSuperadminUser(auth);
    }

    if (!user) {
      return createFallbackProfile(auth, sharedBranding, sharedSiteSettings);
    }

    return {
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? "",
      faviconUrl: sharedSiteSettings.faviconUrl,
      siteTitle: sharedSiteSettings.siteTitle,
      sidebarLogoUrl: sharedBranding.sidebarLogoUrl,
      sidebarHeading: sharedBranding.sidebarHeading,
      sidebarSubheading: sharedBranding.sidebarSubheading,
    };
  } catch (error) {
    if (!isMongoConnectionError(error)) {
      throw error;
    }

    return createFallbackProfile(auth, {
      sidebarLogoUrl: "",
      sidebarHeading: "",
      sidebarSubheading: "",
    }, {
      faviconUrl: DEFAULT_FAVICON_URL,
      siteTitle: DEFAULT_SITE_TITLE,
    });
  }
}
