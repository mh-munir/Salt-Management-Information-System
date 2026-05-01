import { requireAuth } from "@/lib/auth";
import { getCurrentUserProfileSnapshot } from "@/lib/user-profile.server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = requireAuth(request, ["admin", "superadmin"]);
  if (authResult instanceof Response) return authResult;

  return Response.json(await getCurrentUserProfileSnapshot(authResult), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
