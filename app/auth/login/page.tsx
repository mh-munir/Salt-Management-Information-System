
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useSidebarBranding } from "@/lib/useSidebarBranding";
import { translate } from "@/lib/language";
import { useLanguage } from "@/lib/useLanguage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const branding = useSidebarBranding();
  const sidebarHeading = branding.sidebarHeading;
  const sidebarSubheading = branding.sidebarSubheading;
  const { language } = useLanguage();

  // Load saved credentials if remember is checked
  useEffect(() => {
    if (remember) {
      const savedEmail = localStorage.getItem("savedEmail");
      const savedPassword = localStorage.getItem("savedPassword");
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
    }
  }, [remember]);

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
        <section className="w-full max-w-md rounded-md border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-sm">
              <span className="text-lg font-semibold">SM</span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-800">{sidebarHeading}</p>
            <p className="mt-2 text-sm text-slate-500">{sidebarSubheading}</p>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translate(language, "continueWithEmail")}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">{translate(language, "emailAddress")}</label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={translate(language, "emailPlaceholder")}
                autoComplete="email"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">{translate(language, "password")}</label>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={translate(language, "passwordPlaceholder")}
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-9 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575m1.875-2.25A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.403 3.22-1.125 4.575m-1.875 2.25A9.956 9.956 0 0112 21c-1.657 0-3.22-.403-4.575-1.125m-2.25-1.875A9.956 9.956 0 013 12c0-1.657.403-3.22 1.125-4.575m2.25-2.25A9.956 9.956 0 0112 3c1.657 0 3.22.403 4.575 1.125m2.25 1.875A9.956 9.956 0 0121 12c0 1.657-.403 3.22-1.125 4.575m-2.25 2.25A9.956 9.956 0 0112 21c-1.657 0-3.22-.403-4.575-1.125" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575m1.875-2.25A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.403 3.22-1.125 4.575m-1.875 2.25A9.956 9.956 0 0112 21c-1.657 0-3.22-.403-4.575-1.125m-2.25-1.875A9.956 9.956 0 013 12c0-1.657.403-3.22 1.125-4.575m2.25-2.25A9.956 9.956 0 0112 3c1.657 0 3.22.403 4.575 1.125m2.25 1.875A9.956 9.956 0 0121 12c0 1.657-.403 3.22-1.125 4.575m-2.25 2.25A9.956 9.956 0 0112 21c-1.657 0-3.22-.403-4.575-1.125" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16" /></svg>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                {translate(language, "keepMeSignedIn")}
              </label>
              <button type="button" className="button-utility text-sm font-medium text-slate-400 hover:text-slate-600">
                {translate(language, "forgotPassword")}
              </button>
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#348CD4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F7FC0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? translate(language, "signingIn") : translate(language, "signIn")}
            </button>
          </form>

        </section>
      </div>
    </main>
  );
}
