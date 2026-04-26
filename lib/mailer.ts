const isProduction = process.env.NODE_ENV === "production";
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() ?? "";
const OTP_FROM_EMAIL = process.env.OTP_FROM_EMAIL?.trim() ?? "";

type OtpMailInput = {
  to: string;
  requesterEmail: string;
  targetAdminEmail: string;
  otpCode: string;
};

type PasswordResetMailInput = Omit<OtpMailInput, "targetAdminEmail"> & {
  targetEmail: string;
};

export async function sendAdminOtpEmail({
  to,
  requesterEmail,
  targetAdminEmail,
  otpCode,
}: OtpMailInput) {
  const subject = "OTP approval for admin account creation";
  const text = `Hello Super Admin,\n\nYou requested to create a new admin account for: ${targetAdminEmail}\n\nYour OTP is: ${otpCode}\nIt expires in 10 minutes.\n\nThis OTP was sent to: ${requesterEmail}\nIf you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:14px">
      <h2 style="margin:0 0 8px;color:#0f172a">Salt Mill System</h2>
      <p style="margin:0 0 14px;color:#334155">Hello Super Admin,</p>
      <p style="margin:0 0 10px;color:#334155">You requested to create a new admin account for:</p>
      <p style="margin:0 0 14px;color:#0f172a;font-weight:600">${targetAdminEmail}</p>
      <p style="margin:0 0 14px;color:#334155">Use the OTP below to complete admin account creation:</p>
      <p style="margin:0 0 14px;font-size:30px;font-weight:700;letter-spacing:8px;color:#2563eb">${otpCode}</p>
      <p style="margin:0;color:#64748b">This OTP expires in 10 minutes.</p>
    </div>
  `;

  if (!RESEND_API_KEY || !OTP_FROM_EMAIL) {
    if (isProduction) {
      throw new Error("Email service is not configured. Set RESEND_API_KEY and OTP_FROM_EMAIL.");
    }
    return { delivered: false, provider: "console" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: OTP_FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to send OTP email (${response.status}): ${body}`);
  }

  return { delivered: true, provider: "resend" as const };
}

export async function sendPasswordResetOtpEmail({
  to,
  requesterEmail,
  targetEmail,
  otpCode,
}: PasswordResetMailInput) {
  const subject = "Password reset approval required";
  const text = `Hello Super Admin,\n\nA password reset was requested for: ${targetEmail}\n\nYour OTP is: ${otpCode}\nIt expires in 10 minutes.\n\nThis reset request was initiated from: ${requesterEmail}. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:14px">
      <h2 style="margin:0 0 8px;color:#0f172a">Salt Mill System</h2>
      <p style="margin:0 0 14px;color:#334155">Hello Super Admin,</p>
      <p style="margin:0 0 10px;color:#334155">A password reset was requested for:</p>
      <p style="margin:0 0 14px;color:#0f172a;font-weight:600">${targetEmail}</p>
      <p style="margin:0 0 14px;color:#334155">Use the OTP below to approve and complete the reset:</p>
      <p style="margin:0 0 14px;font-size:30px;font-weight:700;letter-spacing:8px;color:#2563eb">${otpCode}</p>
      <p style="margin:0;color:#64748b">This OTP expires in 10 minutes.</p>
    </div>
  `;

  if (!RESEND_API_KEY || !OTP_FROM_EMAIL) {
    if (isProduction) {
      throw new Error("Email service is not configured. Set RESEND_API_KEY and OTP_FROM_EMAIL.");
    }
    return { delivered: false, provider: "console" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: OTP_FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to send OTP email (${response.status}): ${body}`);
  }

  return { delivered: true, provider: "resend" as const };
}
