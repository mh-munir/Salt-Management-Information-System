function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : "";
}

export function getOptionalEnv(name: string) {
  return normalizeEnvValue(process.env[name]);
}

export function requireEnv(name: string) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
}

export function getCsvEnv(name: string) {
  return getOptionalEnv(name)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
