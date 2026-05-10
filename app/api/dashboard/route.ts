import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { DASHBOARD_API_CACHE_CONTROL } from "@/lib/cache-control";
import { getDashboardPageData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authResult = requireAuth(request, ["admin", "superadmin"]);
    if (authResult instanceof Response) return authResult;

    return apiSuccess(await getDashboardPageData(), {
      headers: { "Cache-Control": DASHBOARD_API_CACHE_CONTROL },
    });
  } catch (error) {
    return handleRouteError(error, { route: "/api/dashboard" });
  }
}
