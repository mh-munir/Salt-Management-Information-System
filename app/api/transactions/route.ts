import { requireAuth } from "@/lib/auth";
import { DASHBOARD_API_CACHE_CONTROL } from "@/lib/cache-control";
import { resolvePaginationParams } from "@/lib/pagination";
import { getTransactionsFeed } from "@/lib/transactions-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  const { searchParams } = new URL(request.url);
  const pagination = resolvePaginationParams(searchParams, { defaultLimit: 50, maxLimit: 100 });

  return Response.json(await getTransactionsFeed(pagination), {
    headers: { "Cache-Control": DASHBOARD_API_CACHE_CONTROL },
  });
}
