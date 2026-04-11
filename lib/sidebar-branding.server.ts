import type { AuthTokenPayload } from "@/lib/auth";
import { connectDB, isMongoConnectionError, isValidMongoObjectId } from "@/lib/db";
import User from "@/models/User";
import {
  DEFAULT_BRAND_HEADING,
  DEFAULT_BRAND_SUBHEADING,
  type SidebarBrandingSnapshot,
  normalizeSidebarBranding,
} from "@/lib/sidebar-branding";

const emptySidebarBranding: SidebarBrandingSnapshot = {
  sidebarLogoUrl: "",
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

export async function getSidebarBrandingSnapshot(
  auth: AuthTokenPayload | null
): Promise<SidebarBrandingSnapshot> {
  if (!auth) return emptySidebarBranding;

  try {
    await connectDB();

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
