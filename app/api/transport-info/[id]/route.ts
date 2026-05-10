import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import TransportInfo from "@/models/TransportInfo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request, context: RouteContext<"/api/transport-info/[id]">) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    const { id } = await context.params;

    await connectDB();

    const entry = await TransportInfo.findById(id, {
      drivingLicenseDataUrl: 1,
      drivingLicenseFileName: 1,
      helperIdCardDataUrl: 1,
      helperIdCardFileName: 1,
      driverIdCardDataUrl: 1,
      driverIdCardFileName: 1,
    }).lean();

    if (!entry) {
      return Response.json({ message: "Transport entry not found." }, { status: 404 });
    }

    return Response.json({
      _id: String(entry._id),
      drivingLicenseDataUrl: String(entry.drivingLicenseDataUrl ?? "").trim(),
      drivingLicenseFileName: String(entry.drivingLicenseFileName ?? "").trim(),
      helperIdCardDataUrl: String(entry.helperIdCardDataUrl ?? "").trim(),
      helperIdCardFileName: String(entry.helperIdCardFileName ?? "").trim(),
      driverIdCardDataUrl: String(entry.driverIdCardDataUrl ?? "").trim(),
      driverIdCardFileName: String(entry.driverIdCardFileName ?? "").trim(),
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return Response.json({ message: "Transport info unavailable." }, { status: 503 });
    }

    throw error;
  }
}
