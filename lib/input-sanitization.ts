const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;
const MULTI_SPACE = /\s+/g;

export function sanitizeTextInput(value: unknown, options?: { maxLength?: number; preserveNewlines?: boolean }) {
  const maxLength = options?.maxLength ?? 500;
  const preserveNewlines = options?.preserveNewlines ?? false;
  const raw = String(value ?? "");
  const withoutControls = raw.replace(CONTROL_CHARACTERS, preserveNewlines ? " " : "");
  const normalizedWhitespace = preserveNewlines
    ? withoutControls.replace(/\r\n/g, "\n").trim()
    : withoutControls.replace(MULTI_SPACE, " ").trim();

  return normalizedWhitespace.slice(0, maxLength);
}

export function sanitizePhoneInput(value: unknown) {
  return String(value ?? "").replace(/[^\d]/g, "").slice(0, 20);
}

export function sanitizeDataUrl(value: unknown, maxLength = 2_000_000) {
  const normalized = String(value ?? "").trim();
  return normalized.slice(0, maxLength);
}
