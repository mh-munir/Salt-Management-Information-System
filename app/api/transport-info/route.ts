import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import TransportInfo from "@/models/TransportInfo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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

    return Response.json(normalized);
  } catch (error) {
    if (isMongoConnectionError(error)) {
      console.warn("Transport info unavailable, returning empty list.");
      return Response.json([]);
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  await connectDB();
  const body = await request.json();

  const driverName = String(body.driverName ?? "").trim();
  const driverMobileNumber = String(body.driverMobileNumber ?? "").trim();
  const helperName = String(body.helperName ?? "").trim();
  const customerName = String(body.customerName ?? "").trim();
  const trackNumber = String(body.trackNumber ?? "").trim();
  const drivingLicenseDataUrl = String(body.drivingLicenseDataUrl ?? "").trim();
  const drivingLicenseFileName = String(body.drivingLicenseFileName ?? "").trim();
  const helperIdCardDataUrl = String(body.helperIdCardDataUrl ?? "").trim();
  const helperIdCardFileName = String(body.helperIdCardFileName ?? "").trim();
  const driverIdCardDataUrl = String(body.driverIdCardDataUrl ?? "").trim();
  const driverIdCardFileName = String(body.driverIdCardFileName ?? "").trim();
  const date = String(body.date ?? "").trim();

  if (!driverName) {
    return Response.json({ message: "Driver name is required." }, { status: 400 });
  }

  if (!helperName) {
    return Response.json({ message: "Helper name is required." }, { status: 400 });
  }

  if (!driverMobileNumber || !/^\d{11}$/.test(driverMobileNumber)) {
    return Response.json({ message: "Driver mobile number must be exactly 11 digits." }, { status: 400 });
  }

  if (!customerName) {
    return Response.json({ message: "Customer name is required." }, { status: 400 });
  }

  if (!trackNumber) {
    return Response.json({ message: "Track number is required." }, { status: 400 });
  }

  if (!drivingLicenseDataUrl || !drivingLicenseFileName) {
    return Response.json({ message: "Driving license file is required." }, { status: 400 });
  }

  if (!date || Number.isNaN(new Date(date).getTime())) {
    return Response.json({ message: "Valid date is required." }, { status: 400 });
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

  return Response.json(
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
}
