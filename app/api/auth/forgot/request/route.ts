import { createHash, randomInt } from "crypto";
import { connectDB } from "@/lib/db";
import { validateSameOrigin } from "@/lib/auth";
import { sendPasswordResetOtpEmail } from "@/lib/mailer";
import User from "@/models/User";
import PasswordResetOtpRequest from "@/models/PasswordResetOtpRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const OTP_EXPIRY_MINUTES = 10;
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET?.trim() || "dev-only-otp-secret";
const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL?.trim().toLowerCase() ?? "";
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD?.trim() ?? "";
const isSuperuserBootstrapConfigured = Boolean(SUPERUSER_EMAIL && SUPERUSER_PASSWORD);

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const buildOtpHash = (email: string, otpCode: string) =>
  createHash("sha256").update(`${email}:${otpCode}:${OTP_HASH_SECRET}`).digest("hex");
const createOtpCode = () => String(randomInt(100000, 1000000));

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const payload = await request.json().catch(() => null);
  const email = String(payload?.email ?? "").trim().toLowerCase();

  if (!email) {
    return Response.json({ message: "Email is required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return Response.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  if (!isSuperuserBootstrapConfigured) {
    return Response.json(
      { message: "Super admin credentials are not configured. Password recovery is unavailable." },
      { status: 500 }
    );
  }

  await connectDB();

  const targetUser = await User.findOne({ email });
  if (!targetUser && email !== SUPERUSER_EMAIL) {
    return Response.json({ message: "No user found with this email." }, { status: 404 });
  }

  const otpCode = createOtpCode();
  const otpHash = buildOtpHash(email, otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await PasswordResetOtpRequest.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      otpExpiresAt: expiresAt,
      attemptsRemaining: 5,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  try {
    await sendPasswordResetOtpEmail({
      to: SUPERUSER_EMAIL,
      requesterEmail: email,
      targetEmail: email,
      otpCode,
    });
  } catch (error) {
    await PasswordResetOtpRequest.deleteOne({ email });
    const reason = error instanceof Error ? error.message : "Unknown email provider error.";
    return Response.json({ message: `Failed to send OTP email. ${reason}` }, { status: 500 });
  }

  return Response.json({
    message: "Password reset OTP sent to the super admin email.",
    otpSentTo: SUPERUSER_EMAIL,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    ...(process.env.NODE_ENV !== "production" ? { devOtp: otpCode } : {}),
  });
}
