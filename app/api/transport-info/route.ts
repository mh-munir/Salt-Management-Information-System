import { connectDB, isMongoConnectionError } from "@/lib/db";
import { z } from "zod";
import { apiError, apiSuccess, handleRouteError, parseJsonBody } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { sanitizeDataUrl, sanitizePhoneInput, sanitizeTextInput } from "@/lib/input-sanitization";
import TransportInfo from "@/models/TransportInfo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const transportPayloadSchema = z.object({
  driverName: z.string().min(1).max(80),
  driverMobileNumber: z.string().min(11).max(20),
  helperName: z.string().min(1).max(80),
  customerName: z.string().min(1).max(120),
  trackNumber: z.string().min(1).max(60),
  drivingLicenseDataUrl: z.string().min(1).max(2_000_000),
  drivingLicenseFileName: z.string().min(1).max(160),
  helperIdCardDataUrl: z.string().max(2_000_000).optional().default(""),
  helperIdCardFileName: z.string().max(160).optional().default(""),
  driverIdCardDataUrl: z.string().max(2_000_000).optional().default(""),
  driverIdCardFileName: z.string().max(160).optional().default(""),
  date: z.string().min(1).max(40),
});

const getPreviewKind = (value: unknown) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) return "none";
  if (normalized.startsWith("data:image/")) return "image";
  if (normalized.startsWith("data:application/pdf")) return "pdf";

  return "file";
};

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();
    const entries = await TransportInfo.find(
      {},
      {
        driverName: 1,
        driverMobileNumber: 1,
        helperName: 1,
        customerName: 1,
        trackNumber: 1,
        drivingLicenseDataUrl: 1,
        drivingLicenseFileName: 1,
        helperIdCardDataUrl: 1,
        helperIdCardFileName: 1,
        driverIdCardDataUrl: 1,
        driverIdCardFileName: 1,
        date: 1,
        createdAt: 1,
      }
    )
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .lean();

    const normalized = entries.map((entry) => {
      const drivingLicenseDataUrl = String(entry.drivingLicenseDataUrl ?? "").trim();
      const helperIdCardDataUrl = String(entry.helperIdCardDataUrl ?? "").trim();
      const driverIdCardDataUrl = String(entry.driverIdCardDataUrl ?? "").trim();
      const drivingLicensePreviewKind = getPreviewKind(drivingLicenseDataUrl);
      const helperIdCardPreviewKind = getPreviewKind(helperIdCardDataUrl);
      const driverIdCardPreviewKind = getPreviewKind(driverIdCardDataUrl);

      return {
        _id: String(entry._id),
        driverName: String(entry.driverName ?? "").trim(),
        driverMobileNumber: String(entry.driverMobileNumber ?? "").trim(),
        helperName: String(entry.helperName ?? "").trim(),
        customerName: String(entry.customerName ?? "").trim(),
        trackNumber: String(entry.trackNumber ?? "").trim(),
        drivingLicensePreviewUrl: drivingLicensePreviewKind === "image" ? drivingLicenseDataUrl : "",
        drivingLicensePreviewKind,
        drivingLicenseFileName: String(entry.drivingLicenseFileName ?? "").trim(),
        helperIdCardPreviewUrl: helperIdCardPreviewKind === "image" ? helperIdCardDataUrl : "",
        helperIdCardPreviewKind,
        helperIdCardFileName: String(entry.helperIdCardFileName ?? "").trim(),
        driverIdCardPreviewUrl: driverIdCardPreviewKind === "image" ? driverIdCardDataUrl : "",
        driverIdCardPreviewKind,
        driverIdCardFileName: String(entry.driverIdCardFileName ?? "").trim(),
        hasDrivingLicense: Boolean(drivingLicenseDataUrl),
        hasHelperIdCard: Boolean(helperIdCardDataUrl),
        hasDriverIdCard: Boolean(driverIdCardDataUrl),
        date: entry.date,
        createdAt: entry.createdAt,
      };
    });

    return apiSuccess(normalized);
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return apiSuccess([]);
    }

    return handleRouteError(error, { route: "/api/transport-info" });
  }
}

export async function POST(request: Request) {
  try {
    const originError = validateSameOrigin(request);
    if (originError) return originError;

    const authResult = requireAuth(request, ["admin", "superadmin"]);
    if (authResult instanceof Response) return authResult;

    const parsedBody = await parseJsonBody(request, transportPayloadSchema);
    if (!parsedBody.success) return parsedBody.response;

    await connectDB();

    const driverName = sanitizeTextInput(parsedBody.data.driverName, { maxLength: 80 });
    const driverMobileNumber = sanitizePhoneInput(parsedBody.data.driverMobileNumber);
    const helperName = sanitizeTextInput(parsedBody.data.helperName, { maxLength: 80 });
    const customerName = sanitizeTextInput(parsedBody.data.customerName, { maxLength: 120 });
    const trackNumber = sanitizeTextInput(parsedBody.data.trackNumber, { maxLength: 60 });
    const drivingLicenseDataUrl = sanitizeDataUrl(parsedBody.data.drivingLicenseDataUrl);
    const drivingLicenseFileName = sanitizeTextInput(parsedBody.data.drivingLicenseFileName, { maxLength: 160 });
    const helperIdCardDataUrl = sanitizeDataUrl(parsedBody.data.helperIdCardDataUrl);
    const helperIdCardFileName = sanitizeTextInput(parsedBody.data.helperIdCardFileName, { maxLength: 160 });
    const driverIdCardDataUrl = sanitizeDataUrl(parsedBody.data.driverIdCardDataUrl);
    const driverIdCardFileName = sanitizeTextInput(parsedBody.data.driverIdCardFileName, { maxLength: 160 });
    const date = sanitizeTextInput(parsedBody.data.date, { maxLength: 40 });

    if (!/^\d{11}$/.test(driverMobileNumber)) {
      return apiError("Driver mobile number must be exactly 11 digits.", 400, { code: "invalid_mobile_number" });
    }

    if (!date || Number.isNaN(new Date(date).getTime())) {
      return apiError("Valid date is required.", 400, { code: "invalid_date" });
    }

    const entry = await TransportInfo.create({
      driverName,
      driverMobileNumber,
      helperName,
      customerName,
      trackNumber,
      drivingLicenseDataUrl,
      drivingLicenseFileName,
      helperIdCardDataUrl,
      helperIdCardFileName,
      driverIdCardDataUrl,
      driverIdCardFileName,
      date: new Date(date),
    });

    logActivity({
      action: "transport_info.create",
      actorId: authResult.userId,
      actorEmail: authResult.email,
      actorRole: authResult.role,
      targetType: "transport_info",
      targetId: String(entry._id),
      metadata: { trackNumber },
    });

    return apiSuccess(
      {
        _id: String(entry._id),
        driverName: entry.driverName,
        driverMobileNumber: entry.driverMobileNumber,
        helperName: entry.helperName,
        customerName: entry.customerName,
        trackNumber: entry.trackNumber,
        drivingLicenseDataUrl: entry.drivingLicenseDataUrl,
        drivingLicenseFileName: entry.drivingLicenseFileName,
        helperIdCardDataUrl: entry.helperIdCardDataUrl,
        helperIdCardFileName: entry.helperIdCardFileName,
        driverIdCardDataUrl: entry.driverIdCardDataUrl,
        driverIdCardFileName: entry.driverIdCardFileName,
        date: entry.date,
        createdAt: entry.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return apiError("Database is temporarily unavailable. Please try again.", 503, { code: "db_unavailable" });
    }

    return handleRouteError(error, { route: "/api/transport-info" });
  }
}
