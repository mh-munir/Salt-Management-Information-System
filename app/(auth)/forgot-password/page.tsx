"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PlainImage from "@/components/PlainImage";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DEFAULT_BRAND_HEADING,
  DEFAULT_BRAND_SUBHEADING,
} from "@/lib/sidebar-branding";
import { translate } from "@/lib/language";
import { useSidebarBranding } from "@/lib/useSidebarBranding";
import { useLanguage } from "@/lib/useLanguage";

type Step = "request" | "verify" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const { language } = useLanguage();
  const branding = useSidebarBranding();
  const sidebarLogoUrl = branding.sidebarLogoUrl;
  const sidebarHeading = branding.sidebarHeading || DEFAULT_BRAND_HEADING;
  const sidebarSubheading = branding.sidebarSubheading || DEFAULT_BRAND_SUBHEADING;

  const requestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/auth/forgot/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "Unable to request reset OTP.");
        setLoading(false);
        return;
      }

      setInfo(data?.message ?? "OTP sent to super admin email.");
      setStep("verify");
    } catch {
      setError("Unable to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "Unable to reset password.");
        setLoading(false);
        return;
      }

      setInfo(data?.message ?? "Password updated successfully.");
      setStep("success");
    } catch {
      setError("Unable to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell relative min-h-screen overflow-hidden bg-[#F0F1F7] px-4 py-8">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rotate-[-35deg] rounded-[48px] border border-fuchsia-200/70 bg-linear-to-br from-fuchsia-200/40 via-transparent to-sky-200/40" />
      <div className="pointer-events-none absolute -right-14 top-0 h-64 w-64 rotate-[35deg] rounded-[48px] border border-indigo-200/70 bg-linear-to-br from-sky-200/40 via-transparent to-fuchsia-200/40" />
      <div className="pointer-events-none absolute left-20 top-1/2 h-14 w-14 rounded-full border border-indigo-200/70 bg-indigo-100/60" />
      <div className="pointer-events-none absolute right-20 top-1/3 h-10 w-10 rounded-full border border-fuchsia-200/70 bg-fuchsia-100/60" />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-4 flex w-full max-w-fit items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl bg-slate-900 text-white shadow-sm">
              {sidebarLogoUrl ? (
                <PlainImage src={sidebarLogoUrl} alt="Brand logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold">SM</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tracking-tight text-slate-800">{sidebarHeading}</p>
            <p className="mt-2 text-sm text-slate-500">{sidebarSubheading}</p>
          </div>

          <div className="mt-5 mb-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            {step === "request" ? (
              <p>Enter your email and an OTP will be sent to the super admin email for recovery approval.</p>
            ) : (
              <p>Enter the OTP you received via the super admin email, then choose a new password.</p>
            )}
          </div>

          {error ? <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {info ? <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</p> : null}

          {step === "success" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">Your password has been updated. You may now sign in with your new password.</p>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full rounded-lg bg-[#348CD4] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#2F7FC0]"
              >
                Return to login
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={step === "request" ? requestOtp : verifyOtp}>
              <div>
                <label htmlFor="forgot-email" className="mb-1.5 block text-lg font-medium text-slate-700">
                  {translate(language, "emailAddress")}
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={translate(language, "emailPlaceholder")}
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-lg text-slate-800 outline-none transition focus:border-blue-500"
                />
              </div>

              {step === "verify" ? (
                <>
                  <div>
                    <label htmlFor="forgot-otp" className="mb-1.5 block text-lg font-medium text-slate-700">OTP</label>
                    <input
                      id="forgot-otp"
                      name="otp"
                      type="text"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-lg text-slate-800 outline-none transition focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="mb-1.5 block text-lg font-medium text-slate-700">New password</label>
                    <input
                      id="new-password"
                      name="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder={translate(language, "passwordPlaceholder")}
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-lg text-slate-800 outline-none transition focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="mb-1.5 block text-lg font-medium text-slate-700">Confirm password</label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={translate(language, "passwordPlaceholder")}
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-lg text-slate-800 outline-none transition focus:border-blue-500"
                    />
                  </div>
                </>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#348CD4] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#2F7FC0] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? "Working..."
                  : step === "request"
                  ? "Send OTP"
                  : "Reset password"}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900">
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
