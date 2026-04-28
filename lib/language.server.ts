import { cookies } from "next/headers";
import { LANGUAGE_STORAGE_KEY, type Language } from "@/lib/language";

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return cookieStore.get(LANGUAGE_STORAGE_KEY)?.value === "bn" ? "bn" : "en";
}
