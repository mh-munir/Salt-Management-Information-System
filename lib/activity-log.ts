import { logInfo, logWarn } from "@/lib/logger";

type ActivityLogInput = {
  action: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  status?: "success" | "failure";
  metadata?: Record<string, unknown>;
};

export function logActivity(input: ActivityLogInput) {
  const {
    action,
    actorId = "",
    actorEmail = "",
    actorRole = "",
    targetType = "",
    targetId = "",
    status = "success",
    metadata,
  } = input;

  const message = `${action} ${status}`;
  const context = {
    actorId,
    actorEmail,
    actorRole,
    targetType,
    targetId,
    ...metadata,
  };

  if (status === "failure") {
    logWarn("activity", message, context);
    return;
  }

  logInfo("activity", message, context);
}
