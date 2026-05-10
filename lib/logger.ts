type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  event: string;
  message: string;
  context?: Record<string, unknown>;
};

function writeLog(level: LogLevel, payload: LogPayload) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logInfo(event: string, message: string, context?: Record<string, unknown>) {
  writeLog("info", { event, message, context });
}

export function logWarn(event: string, message: string, context?: Record<string, unknown>) {
  writeLog("warn", { event, message, context });
}

export function logError(event: string, message: string, context?: Record<string, unknown>) {
  writeLog("error", { event, message, context });
}
