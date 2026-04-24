export type SiteSettingsSnapshot = {
  faviconUrl: string;
  siteTitle: string;
};

export const DEFAULT_SITE_TITLE = "Salt Management Information System";
export const DEFAULT_FAVICON_URL = "/favicon.ico";

export const normalizeSiteSettings = (
  value?: Partial<SiteSettingsSnapshot> | null
): SiteSettingsSnapshot => ({
  faviconUrl: String(value?.faviconUrl ?? "").trim() || DEFAULT_FAVICON_URL,
  siteTitle: String(value?.siteTitle ?? "").trim() || DEFAULT_SITE_TITLE,
});
