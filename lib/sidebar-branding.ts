export const DEFAULT_BRAND_HEADING = "ynex";
export const DEFAULT_BRAND_SUBHEADING = "Salt Mill System";
const SIDEBAR_BRANDING_STORAGE_KEY = "salt-mill-sidebar-branding";

export type SidebarBrandingSnapshot = {
  sidebarLogoUrl: string;
  sidebarHeading: string;
  sidebarSubheading: string;
};

const emptySnapshot: SidebarBrandingSnapshot = {
  sidebarLogoUrl: "",
  sidebarHeading: DEFAULT_BRAND_HEADING,
  sidebarSubheading: DEFAULT_BRAND_SUBHEADING,
};

export const normalizeSidebarBranding = (
  value?: Partial<SidebarBrandingSnapshot> | null
): SidebarBrandingSnapshot => ({
  sidebarLogoUrl: String(value?.sidebarLogoUrl ?? "").trim(),
  sidebarHeading: String(value?.sidebarHeading ?? "").trim() || DEFAULT_BRAND_HEADING,
  sidebarSubheading: String(value?.sidebarSubheading ?? "").trim() || DEFAULT_BRAND_SUBHEADING,
});

export const loadStoredSidebarBranding = (): SidebarBrandingSnapshot => {
  if (typeof window === "undefined") return emptySnapshot;

  try {
    const rawValue = window.localStorage.getItem(SIDEBAR_BRANDING_STORAGE_KEY);
    if (!rawValue) return emptySnapshot;

    return normalizeSidebarBranding(JSON.parse(rawValue) as Partial<SidebarBrandingSnapshot>);
  } catch {
    return emptySnapshot;
  }
};

export const saveStoredSidebarBranding = (value?: Partial<SidebarBrandingSnapshot> | null) => {
  if (typeof window === "undefined") return;

  try {
    const normalizedValue = normalizeSidebarBranding(value);
    window.localStorage.setItem(SIDEBAR_BRANDING_STORAGE_KEY, JSON.stringify(normalizedValue));
  } catch {
    // Ignore storage write failures and keep runtime state working.
  }
};
