import { connectDB, isMongoConnectionError, isValidMongoObjectId } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { getSharedSiteSettingsSnapshot } from "@/lib/site-settings.server";
import { ensureEnvSuperadminUser } from "@/lib/superadmin";
import { getSharedSidebarBrandingSnapshot } from "@/lib/sidebar-branding.server";
import { getCurrentUserProfileSnapshot } from "@/lib/user-profile.server";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const isValidImageUrl = (value: string) =>
  /^https?:\/\/.+/i.test(value) || /^data:image\/[a-zA-Z0-9.+-]+;base64,.+/i.test(value);

const buildUserLookup = (userId: string | undefined, email: string) => {
  const filters: Array<{ _id?: string; email?: string }> = [{ email: email.toLowerCase() }];
  if (isValidMongoObjectId(userId)) {
    filters.unshift({ _id: userId });
  }
  return { $or: filters };
};

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    const profile = await getCurrentUserProfileSnapshot(authResult);
    return Response.json(
      profile,
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    if (!isMongoConnectionError(error)) {
      throw error;
    }

    return Response.json(await getCurrentUserProfileSnapshot(authResult), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
}

export async function PUT(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  const payload = await request.json();
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(payload ?? {}, "avatarUrl");
  const hasSidebarLogoUrl = Object.prototype.hasOwnProperty.call(payload ?? {}, "sidebarLogoUrl");
  const hasSidebarHeading = Object.prototype.hasOwnProperty.call(payload ?? {}, "sidebarHeading");
  const hasSidebarSubheading = Object.prototype.hasOwnProperty.call(payload ?? {}, "sidebarSubheading");
  const hasFaviconUrl = Object.prototype.hasOwnProperty.call(payload ?? {}, "faviconUrl");
  const hasSiteTitle = Object.prototype.hasOwnProperty.call(payload ?? {}, "siteTitle");

  if (
    !hasAvatarUrl &&
    !hasSidebarLogoUrl &&
    !hasSidebarHeading &&
    !hasSidebarSubheading &&
    !hasFaviconUrl &&
    !hasSiteTitle
  ) {
    return Response.json({ message: "No updatable fields provided." }, { status: 400 });
  }

  const avatarUrl = String(payload?.avatarUrl ?? "").trim();
  const sidebarLogoUrl = String(payload?.sidebarLogoUrl ?? "").trim();
  const sidebarHeading = String(payload?.sidebarHeading ?? "").trim();
  const sidebarSubheading = String(payload?.sidebarSubheading ?? "").trim();
  const faviconUrl = String(payload?.faviconUrl ?? "").trim();
  const siteTitle = String(payload?.siteTitle ?? "").trim();

  if (hasAvatarUrl && avatarUrl && !isValidImageUrl(avatarUrl)) {
    return Response.json(
      { message: "Avatar must be a valid http(s) URL or data:image base64 value." },
      { status: 400 }
    );
  }

  if (hasSidebarLogoUrl && sidebarLogoUrl && !isValidImageUrl(sidebarLogoUrl)) {
    return Response.json(
      { message: "Sidebar logo must be a valid http(s) URL or data:image base64 value." },
      { status: 400 }
    );
  }

  if (hasFaviconUrl && faviconUrl && !isValidImageUrl(faviconUrl)) {
    return Response.json(
      { message: "Favicon must be a valid http(s) URL or data:image base64 value." },
      { status: 400 }
    );
  }

  if (hasSidebarHeading && sidebarHeading.length > 40) {
    return Response.json({ message: "Sidebar heading must be 40 characters or fewer." }, { status: 400 });
  }

  if (hasSidebarSubheading && sidebarSubheading.length > 80) {
    return Response.json({ message: "Sidebar subheading must be 80 characters or fewer." }, { status: 400 });
  }

  if (hasSiteTitle && siteTitle.length > 80) {
    return Response.json({ message: "Site title must be 80 characters or fewer." }, { status: 400 });
  }

  const updatePayload: Record<string, string> = {};
  if (hasAvatarUrl) updatePayload.avatarUrl = avatarUrl;
  if (hasSidebarLogoUrl) updatePayload.sidebarLogoUrl = sidebarLogoUrl;
  if (hasSidebarHeading) updatePayload.sidebarHeading = sidebarHeading;
  if (hasSidebarSubheading) updatePayload.sidebarSubheading = sidebarSubheading;
  if (hasFaviconUrl) updatePayload.faviconUrl = faviconUrl;
  if (hasSiteTitle) updatePayload.siteTitle = siteTitle;

  await connectDB();
  await ensureEnvSuperadminUser(authResult);
  if (hasSidebarLogoUrl || hasSidebarHeading || hasSidebarSubheading || hasFaviconUrl || hasSiteTitle) {
    const sharedBrandingUpdate: Record<string, string> = {};
    if (hasSidebarLogoUrl) sharedBrandingUpdate.sidebarLogoUrl = sidebarLogoUrl;
    if (hasSidebarHeading) sharedBrandingUpdate.sidebarHeading = sidebarHeading;
    if (hasSidebarSubheading) sharedBrandingUpdate.sidebarSubheading = sidebarSubheading;
    if (hasFaviconUrl) sharedBrandingUpdate.faviconUrl = faviconUrl;
    if (hasSiteTitle) sharedBrandingUpdate.siteTitle = siteTitle;

    await User.updateMany(
      { role: { $in: ["admin", "superadmin"] } },
      { $set: sharedBrandingUpdate },
      { strict: false }
    );
  }

  let user = null;
  if (hasAvatarUrl) {
    user = await User.findOneAndUpdate(
      buildUserLookup(authResult.userId, authResult.email),
      { $set: { avatarUrl } },
      { returnDocument: "after" }
    ).select("name email role avatarUrl sidebarLogoUrl sidebarHeading sidebarSubheading faviconUrl siteTitle");
  } else {
    user = await User.findOne(buildUserLookup(authResult.userId, authResult.email)).select(
      "name email role avatarUrl sidebarLogoUrl sidebarHeading sidebarSubheading faviconUrl siteTitle"
    );
  }

  if (!user) {
    return Response.json({ message: "User not found." }, { status: 404 });
  }

  const sharedBranding = await getSharedSidebarBrandingSnapshot();
  const sharedSiteSettings = await getSharedSiteSettingsSnapshot();

  return Response.json({
    message: "Profile updated.",
    user: {
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? "",
      faviconUrl: sharedSiteSettings.faviconUrl,
      siteTitle: sharedSiteSettings.siteTitle,
      sidebarLogoUrl: sharedBranding.sidebarLogoUrl,
      sidebarHeading: sharedBranding.sidebarHeading,
      sidebarSubheading: sharedBranding.sidebarSubheading,
    },
  });
}
