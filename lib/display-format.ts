// Compile regex pattern once at module level instead of on every function call
const DISPLAY_NAME_PATTERN = /(^[\s\-_/()[\].,]+)([a-z])/g;

export const formatDisplayName = (value?: string, fallback = ""): string => {
  const source = String(value ?? "").trim() || fallback.trim();
  if (!source) return "";
  // Reset regex lastIndex since global flag persists state
  DISPLAY_NAME_PATTERN.lastIndex = 0;
  return source.toLowerCase().replace(DISPLAY_NAME_PATTERN, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
};

export const getNumberLocale = (language: "en" | "bn"): string => language === "bn" ? "bn-BD" : "en-BD";

export const getDateLocale = (language: "en" | "bn"): string => language === "bn" ? "bn-BD" : "en-GB";

export const formatLocalizedNumber = (value: number, language: "en" | "bn", options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat(getNumberLocale(language), { maximumFractionDigits: 2, ...options }).format(value);

export const formatLocalizedDate = (value: string | Date | undefined, language: "en" | "bn", options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(getDateLocale(language), { day: "2-digit", month: "short", year: "numeric", ...options });
};
