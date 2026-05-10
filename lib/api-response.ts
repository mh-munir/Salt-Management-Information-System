import { ZodError, type ZodType } from "zod";
import { logError } from "@/lib/logger";

type ErrorOptions = {
  code?: string;
  details?: unknown;
  headers?: HeadersInit;
};

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function apiError(message: string, status = 400, options?: ErrorOptions) {
  return Response.json(
    {
      success: false,
      message,
      error: {
        code: options?.code ?? "request_error",
        details: options?.details,
      },
    },
    { status, headers: options?.headers },
  );
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      success: false as const,
      response: apiError("Invalid request body. Provide a valid JSON object.", 400, {
        code: "invalid_json",
      }),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false as const,
      response: apiError("Request validation failed.", 400, {
        code: "validation_error",
        details: formatZodError(parsed.error),
      }),
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function handleRouteError(error: unknown, context: { route: string; fallbackMessage?: string }) {
  const message =
    error instanceof Error && error.message ? error.message : context.fallbackMessage ?? "Internal server error.";

  logError("route_error", message, {
    route: context.route,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return apiError(context.fallbackMessage ?? "Internal server error.", 500, {
    code: "internal_error",
  });
}
