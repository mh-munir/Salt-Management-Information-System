const localizedDigitMap: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

const bengaliDigitMap: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export const normalizeLocalizedDigits = (value: string) =>
  value
    .replace(/[০-৯٠-٩۰-۹]/g, (digit) => localizedDigitMap[digit] ?? digit)
    .replace(/[٫۔]/g, ".");

export const localizeDigitsForLanguage = (value: string, language: "en" | "bn") => {
  if (language !== "bn") return value;

  return value.replace(/\d/g, (digit) => bengaliDigitMap[digit] ?? digit);
};

export const normalizeNumberLikeString = (
  value: string,
  options?: {
    allowDecimal?: boolean;
    allowNegative?: boolean;
  }
) => {
  const allowDecimal = options?.allowDecimal ?? true;
  const allowNegative = options?.allowNegative ?? false;

  let normalized = normalizeLocalizedDigits(value).replace(/[,_\s]/g, "").replace(/[^\d.-]/g, "");

  if (!allowNegative) {
    normalized = normalized.replace(/-/g, "");
  } else {
    normalized = normalized.startsWith("-")
      ? `-${normalized.slice(1).replace(/-/g, "")}`
      : normalized.replace(/-/g, "");
  }

  if (!allowDecimal) {
    return normalized.replace(/\./g, "");
  }

  const [whole = "", ...fractionParts] = normalized.split(".");
  if (fractionParts.length === 0) return normalized;

  return `${whole}.${fractionParts.join("")}`;
};

export const parseLocalizedNumber = (
  value: unknown,
  options?: {
    allowDecimal?: boolean;
    allowNegative?: boolean;
  }
) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  const normalized = normalizeNumberLikeString(String(value ?? ""), options);
  if (!normalized) return Number.NaN;

  return Number(normalized);
};
