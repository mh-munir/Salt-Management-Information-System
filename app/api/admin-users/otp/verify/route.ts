import { createHash } from "crypto";
import { connectDB } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import { resolveAuthUserId } from "@/lib/superadmin";
import User from "@/models/User";
import AdminOtpRequest from "@/models/AdminOtpRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET?.trim() || "dev-only-otp-secret";

const buildOtpHash = (email: string, otpCode: string) =>
  createHash("sha256").update(`${email}:${otpCode}:${OTP_HASH_SECRET}`).digest("hex");

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["superadmin"]);
  if (authResult instanceof Response) return authResult;

  const payload = await request.json().catch(() => null);
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const otp = String(payload?.otp ?? "").trim();

  if (!email || !otp) {
    return Response.json({ message: "Email and OTP are required." }, { status: 400 });
  }

  if (!/^\d{6}$/.test(otp)) {
    return Response.json({ message: "OTP must be a 6-digit number." }, { status: 400 });
  }

  await connectDB();
  const requesterUserId = await resolveAuthUserId(authResult);
  if (!requesterUserId) {
    return Response.json({ message: "Could not resolve the current super admin account. Please sign in again." }, { status: 400 });
  }

  const otpRequest = await AdminOtpRequest.findOne({
    requestedBy: requesterUserId,
    email,
  });

  if (!otpRequest) {
    return Response.json({ message: "No pending OTP request found for this email." }, { status: 404 });
  }

  if (new Date(otpRequest.otpExpiresAt).getTime() < Date.now()) {
    await AdminOtpRequest.deleteOne({ _id: otpRequest._id });
    return Response.json({ message: "OTP expired. Please request a new OTP." }, { status: 410 });
  }

  const incomingHash = buildOtpHash(email, otp);
  if (incomingHash !== otpRequest.otpHash) {
    otpRequest.attemptsRemaining = Math.max(0, Number(otpRequest.attemptsRemaining ?? 0) - 1);
    await otpRequest.save();

    if (otpRequest.attemptsRemaining <= 0) {
      await AdminOtpRequest.deleteOne({ _id: otpRequest._id });
      return Response.json({ message: "Too many wrong attempts. Request OTP again." }, { status: 429 });
    }

    return Response.json(
      { message: `Invalid OTP. ${otpRequest.attemptsRemaining} attempts remaining.` },
      { status: 401 }
    );
  }

  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser) {
    await AdminOtpRequest.deleteOne({ _id: otpRequest._id });
    return Response.json({ message: "This email is already in use." }, { status: 409 });
  }

  const createdUser = await User.create({
    name: otpRequest.name,
    email: otpRequest.email,
    passwordHash: otpRequest.passwordHash,
    passwordSalt: otpRequest.passwordSalt,
    role: "admin",
    createdBy: requesterUserId,
  });

  await AdminOtpRequest.deleteOne({ _id: otpRequest._id });

  return Response.json(
    {
      message: "Admin user created successfully.",
      user: {
        _id: String(createdUser._id),
        name: createdUser.name ?? "",
        email: createdUser.email,
        role: createdUser.role,
        avatarUrl: createdUser.avatarUrl ?? "",
      },
    },
    { status: 201 }
  );
}
