import { requireAuth } from "@/lib/auth";
import { DASHBOARD_API_CACHE_CONTROL } from "@/lib/cache-control";
import { getDashboardPageData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  return Response.json(await getDashboardPageData(), {
    headers: { "Cache-Control": DASHBOARD_API_CACHE_CONTROL },
  });
}
