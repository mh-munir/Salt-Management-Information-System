"use client";

import { useSyncExternalStore } from "react";
import { normalizeSidebarBranding, loadStoredSidebarBranding, type SidebarBrandingSnapshot } from "@/lib/sidebar-branding";

const defaultBrandingSnapshot = normalizeSidebarBranding();

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

const getSnapshot = () => loadStoredSidebarBranding();

export function useSidebarBranding(): SidebarBrandingSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => defaultBrandingSnapshot);
}
