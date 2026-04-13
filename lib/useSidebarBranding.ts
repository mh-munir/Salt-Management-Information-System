"use client";

import { useSyncExternalStore } from "react";
import { normalizeSidebarBranding, loadStoredSidebarBranding, type SidebarBrandingSnapshot } from "@/lib/sidebar-branding";

const defaultBrandingSnapshot = normalizeSidebarBranding();
let cachedSnapshot = defaultBrandingSnapshot;

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("sidebar-branding-updated", onStoreChange);
  window.addEventListener("profile-updated", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("sidebar-branding-updated", onStoreChange);
    window.removeEventListener("profile-updated", onStoreChange);
  };
};

const isSameSnapshot = (
  currentSnapshot: SidebarBrandingSnapshot,
  nextSnapshot: SidebarBrandingSnapshot
) =>
  currentSnapshot.sidebarLogoUrl === nextSnapshot.sidebarLogoUrl &&
  currentSnapshot.sidebarHeading === nextSnapshot.sidebarHeading &&
  currentSnapshot.sidebarSubheading === nextSnapshot.sidebarSubheading;

const getSnapshot = () => {
  const nextSnapshot = loadStoredSidebarBranding();

  if (isSameSnapshot(cachedSnapshot, nextSnapshot)) {
    return cachedSnapshot;
  }

  cachedSnapshot = nextSnapshot;
  return cachedSnapshot;
};

export function useSidebarBranding(): SidebarBrandingSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => defaultBrandingSnapshot);
}
