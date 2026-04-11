import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, validateSameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const response = NextResponse.json({ message: "Logged out successfully." });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
