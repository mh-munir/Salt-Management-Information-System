export type AppTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "salt-mill-theme";
export const THEME_COOKIE_NAME = "salt-mill-theme";
export const DEFAULT_THEME: AppTheme = "light";

export const themeInitScript = `
(() => {
  const root = document.documentElement;
  try {
    const theme = root.dataset.theme === "dark" ? "dark" : "${DEFAULT_THEME}";
    root.dataset.theme = theme;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    root.style.colorScheme = theme;
    localStorage.setItem("${THEME_STORAGE_KEY}", theme);
    document.cookie = "${THEME_COOKIE_NAME}=" + theme + "; path=/; max-age=31536000; samesite=lax";
  } catch {
    const theme = root.dataset.theme === "dark" ? "dark" : "${DEFAULT_THEME}";
    root.dataset.theme = theme;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    root.style.colorScheme = theme;
  }
})();
`;

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
  root.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Keep DOM theme in sync even if browser storage is unavailable.
  }
}
