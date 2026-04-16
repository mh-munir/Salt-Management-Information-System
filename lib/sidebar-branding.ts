const DEFAULT_BRAND_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140" viewBox="0 0 480 140" fill="none">
  <rect width="480" height="140" rx="28" fill="#0f172a"/>
  <rect x="8" y="8" width="464" height="124" rx="20" fill="#111827" stroke="#38bdf8" stroke-width="2"/>
  <text x="240" y="62" text-anchor="middle" fill="#f8fafc" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="700">Cos's IT Solution</text>
  <text x="240" y="95" text-anchor="middle" fill="#38bdf8" font-size="15" font-family="Arial, Helvetica, sans-serif" letter-spacing="3">DIGITAL BRANDING</text>
</svg>`.trim();

export const DEFAULT_BRAND_LOGO_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DEFAULT_BRAND_LOGO_SVG)}`;
export const DEFAULT_BRAND_HEADING = "Cos's IT Solution";
export const DEFAULT_BRAND_SUBHEADING = "Develop by Munir";
const SIDEBAR_BRANDING_STORAGE_KEY = "salt-mill-sidebar-branding";

export type SidebarBrandingSnapshot = {
  sidebarLogoUrl: string;
  sidebarHeading: string;
  sidebarSubheading: string;
};

const emptySnapshot: SidebarBrandingSnapshot = {
  sidebarLogoUrl: DEFAULT_BRAND_LOGO_URL,
  sidebarHeading: DEFAULT_BRAND_HEADING,
  sidebarSubheading: DEFAULT_BRAND_SUBHEADING,
};

export const normalizeSidebarBranding = (
  value?: Partial<SidebarBrandingSnapshot> | null
): SidebarBrandingSnapshot => ({
  sidebarLogoUrl: String(value?.sidebarLogoUrl ?? "").trim() || DEFAULT_BRAND_LOGO_URL,
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
