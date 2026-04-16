import { requireAuth } from "@/lib/auth";
import { getTransactionsFeed } from "@/lib/transactions-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  return Response.json(await getTransactionsFeed());
}
