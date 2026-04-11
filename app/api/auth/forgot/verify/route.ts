import { createHash } from "crypto";
import { connectDB } from "@/lib/db";
import { hashPassword, validateSameOrigin } from "@/lib/auth";
import User from "@/models/User";
import PasswordResetOtpRequest from "@/models/PasswordResetOtpRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET?.trim() || "dev-only-otp-secret";
const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL?.trim().toLowerCase() ?? "";
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD?.trim() ?? "";
const isSuperuserBootstrapConfigured = Boolean(SUPERUSER_EMAIL && SUPERUSER_PASSWORD);

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const buildOtpHash = (email: string, otpCode: string) =>
  createHash("sha256").update(`${email}:${otpCode}:${OTP_HASH_SECRET}`).digest("hex");

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const payload = await request.json().catch(() => null);
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const otp = String(payload?.otp ?? "").trim();
  const newPassword = String(payload?.newPassword ?? "").trim();

  if (!email || !otp || !newPassword) {
    return Response.json({ message: "Email, OTP, and new password are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return Response.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  if (!/^[0-9]{6}$/.test(otp)) {
    return Response.json({ message: "OTP must be a 6-digit number." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return Response.json({ message: "New password must be at least 8 characters." }, { status: 400 });
  }

  if (!isSuperuserBootstrapConfigured) {
    return Response.json(
      { message: "Super admin credentials are not configured. Password recovery is unavailable." },
      { status: 500 }
    );
  }

  await connectDB();

  const otpRequest = await PasswordResetOtpRequest.findOne({ email });
  if (!otpRequest) {
    return Response.json({ message: "No pending password reset request found." }, { status: 404 });
  }

  if (new Date(otpRequest.otpExpiresAt).getTime() < Date.now()) {
    await PasswordResetOtpRequest.deleteOne({ _id: otpRequest._id });
    return Response.json({ message: "OTP expired. Please request a new OTP." }, { status: 410 });
  }

  const incomingHash = buildOtpHash(email, otp);
  if (incomingHash !== otpRequest.otpHash) {
    otpRequest.attemptsRemaining = Math.max(0, Number(otpRequest.attemptsRemaining ?? 0) - 1);
    await otpRequest.save();

    if (otpRequest.attemptsRemaining <= 0) {
      await PasswordResetOtpRequest.deleteOne({ _id: otpRequest._id });
      return Response.json({ message: "Too many wrong attempts. Request OTP again." }, { status: 429 });
    }

    return Response.json(
      { message: `Invalid OTP. ${otpRequest.attemptsRemaining} attempts remaining.` },
      { status: 401 }
    );
  }

  const hashedPassword = hashPassword(newPassword);
  let user = await User.findOne({ email });

  if (!user) {
    if (email !== SUPERUSER_EMAIL) {
      await PasswordResetOtpRequest.deleteOne({ _id: otpRequest._id });
      return Response.json({ message: "No user found with this email." }, { status: 404 });
    }

    user = await User.create({
      name: "Super Admin",
      email,
      passwordHash: hashedPassword.hash,
      passwordSalt: hashedPassword.salt,
      role: "superadmin",
    });
  } else {
    user.passwordHash = hashedPassword.hash;
    user.passwordSalt = hashedPassword.salt;
    await user.save();
  }

  await PasswordResetOtpRequest.deleteOne({ _id: otpRequest._id });

  return Response.json({ message: "Password updated successfully." });
}
