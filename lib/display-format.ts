export const formatDisplayName = (value?: string, fallback = "") => {
  const source = String(value ?? "").trim() || fallback.trim();
  if (!source) return "";

  return source
    .toLowerCase()
    .replace(/(^|[\s\-_/()[\].,]+)([a-z])/g, (match, prefix: string, letter: string) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
};

export const getNumberLocale = (language: "en" | "bn") => (language === "bn" ? "bn-BD" : "en-BD");

export const getDateLocale = (language: "en" | "bn") => (language === "bn" ? "bn-BD" : "en-GB");

export const formatLocalizedNumber = (
  value: number,
  language: "en" | "bn",
  options?: Intl.NumberFormatOptions
) =>
  new Intl.NumberFormat(getNumberLocale(language), {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);

export const formatLocalizedDate = (
  value: string | Date | undefined,
  language: "en" | "bn",
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return "-";

  const date = new Date(value);
  return date.toLocaleDateString(getDateLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
};
