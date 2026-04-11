import { createHash, randomInt } from "crypto";
import { connectDB } from "@/lib/db";
import { hashPassword, requireAuth, validateSameOrigin } from "@/lib/auth";
import { sendAdminOtpEmail } from "@/lib/mailer";
import { resolveAuthUserId } from "@/lib/superadmin";
import User from "@/models/User";
import AdminOtpRequest from "@/models/AdminOtpRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const OTP_EXPIRY_MINUTES = 10;
const isProduction = process.env.NODE_ENV === "production";
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET?.trim() || "dev-only-otp-secret";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const buildOtpHash = (email: string, otpCode: string) =>
  createHash("sha256").update(`${email}:${otpCode}:${OTP_HASH_SECRET}`).digest("hex");

const createOtpCode = () => String(randomInt(100000, 1000000));

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["superadmin"]);
  if (authResult instanceof Response) return authResult;

  const payload = await request.json().catch(() => null);
  const name = String(payload?.name ?? "").trim();
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const password = String(payload?.password ?? "").trim();
  const otpRecipientEmail = String(authResult.email ?? "").trim().toLowerCase();

  if (!name || !email || !password) {
    return Response.json({ message: "Name, email, and password are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return Response.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ message: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (!isValidEmail(otpRecipientEmail)) {
    return Response.json(
      { message: "Super admin email is invalid. Please sign in again and retry." },
      { status: 400 }
    );
  }

  await connectDB();
  const requesterUserId = await resolveAuthUserId(authResult);
  if (!requesterUserId) {
    return Response.json({ message: "Could not resolve the current super admin account. Please sign in again." }, { status: 400 });
  }

  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser) {
    return Response.json({ message: "This email is already in use." }, { status: 409 });
  }

  const otpCode = createOtpCode();
  const otpHash = buildOtpHash(email, otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const hashedPassword = hashPassword(password);

  await AdminOtpRequest.findOneAndUpdate(
    { requestedBy: requesterUserId, email },
    {
      requestedBy: requesterUserId,
      name,
      email,
      passwordHash: hashedPassword.hash,
      passwordSalt: hashedPassword.salt,
      otpHash,
      otpExpiresAt: expiresAt,
      attemptsRemaining: 5,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  try {
    await sendAdminOtpEmail({
      to: otpRecipientEmail,
      requesterEmail: otpRecipientEmail,
      targetAdminEmail: email,
      otpCode,
    });
  } catch (error) {
    await AdminOtpRequest.deleteOne({ requestedBy: requesterUserId, email });
    const reason = error instanceof Error ? error.message : "Unknown email provider error.";
    return Response.json({ message: `Failed to send OTP email. ${reason}` }, { status: 500 });
  }

  return Response.json({
    message: "OTP sent to super admin email. Verify OTP to create admin.",
    otpSentTo: otpRecipientEmail,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    ...(isProduction ? {} : { devOtp: otpCode }),
  });
}
