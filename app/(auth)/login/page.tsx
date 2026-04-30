
"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FloatingInput from "@/components/FloatingInput";
import PlainImage from "@/components/PlainImage";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DEFAULT_BRAND_HEADING,
  DEFAULT_BRAND_SUBHEADING,
} from "@/lib/sidebar-branding";
import { translate } from "@/lib/language";
import { useSidebarBranding } from "@/lib/useSidebarBranding";
import { useLanguage } from "@/lib/useLanguage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const branding = useSidebarBranding();
  const sidebarLogoUrl = branding.sidebarLogoUrl;
  const sidebarHeading = branding.sidebarHeading || DEFAULT_BRAND_HEADING;
  const sidebarSubheading = branding.sidebarSubheading || DEFAULT_BRAND_SUBHEADING;

  const login = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Login failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach server. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login();
  };

  // Load saved credentials if remember is checked
  useEffect(() => {
    if (remember) {
      const savedEmail = localStorage.getItem("savedEmail");
      const savedPassword = localStorage.getItem("savedPassword");
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (remember) {
      localStorage.setItem("savedEmail", email);
      localStorage.setItem("savedPassword", password);
    }
  }, [email, password, remember]);

  // Load saved credentials if remember is checked
  useEffect(() => {
    if (remember) {
      const savedEmail = localStorage.getItem("savedEmail");
      if (savedEmail) setEmail(savedEmail);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (remember) {
      localStorage.setItem("savedEmail", email);
    }
  }, [email, remember]);

  return (
    <main className="auth-shell relative min-h-screen overflow-hidden bg-[#F0F1F7] px-4 py-8">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rotate-[-35deg] rounded-[48px] border border-fuchsia-200/70 bg-linear-to-br from-fuchsia-200/40 via-transparent to-sky-200/40" />
      <div className="pointer-events-none absolute -right-14 top-0 h-64 w-64 rotate-[35deg] rounded-[48px] border border-indigo-200/70 bg-linear-to-br from-sky-200/40 via-transparent to-fuchsia-200/40" />
      <div className="pointer-events-none absolute left-20 top-1/2 h-14 w-14 rounded-lg border border-indigo-200/70 bg-indigo-100/60" />
      <div className="pointer-events-none absolute right-20 top-1/3 h-10 w-10 rounded-lg border border-fuchsia-200/70 bg-fuchsia-100/60" />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-1 flex w-full max-w-fit items-center justify-center">
            <div className="flex h-auto w-32 items-center justify-center overflow-hidden ">
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

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translate(language, "continueWithEmail")}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <FloatingInput
              id="login-email"
              name="email"
              type="email"
              label={translate(language, "emailAddress")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              inputClassName="w-full rounded-lg border border-slate-200 bg-white px-3 text-lg text-slate-800 outline-none transition focus:border-blue-500"
              labelClassName="bg-white text-slate-500"
            />
            <div className="relative">
              <FloatingInput
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                label={translate(language, "password")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                inputClassName="w-full rounded-lg border border-slate-200 bg-white px-3 text-lg text-slate-800 outline-none transition focus:border-blue-500 pr-10"
                labelClassName="bg-white text-slate-500"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M15.75 15.75A6 6 0 018.25 8.25m7.5 7.5A6 6 0 008.25 8.25m7.5 7.5c-1.5 1.5-4.5 3-7.5 3s-6-1.5-7.5-3c1.5-1.5 4.5-3 7.5-3s6 1.5 7.5 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.75 7.5 7.5 4.5 12 4.5s8.25 3 9.75 7.5c-1.5 4.5-5.25 7.5-9.75 7.5S3.75 16.5 2.25 12z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-lg text-slate-600">
                <input
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                {translate(language, "keepMeSignedIn")}
              </label>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#348CD4] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#2F7FC0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? translate(language, "signingIn") : translate(language, "signIn")}
            </button>
          </form>

        </section>
      </div>
    </main>
  );
}
