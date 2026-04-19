"use client";

import { FormEvent, useState } from "react";
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
  const branding = useSidebarBranding();
  const sidebarHeading = branding.sidebarHeading;
  const sidebarSubheading = branding.sidebarSubheading;
  const { language } = useLanguage();

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
      <div className="pointer-events-none absolute left-20 top-1/2 h-14 w-14 rounded-full border border-indigo-200/70 bg-indigo-100/60" />
      <div className="pointer-events-none absolute right-20 top-1/3 h-10 w-10 rounded-full border border-fuchsia-200/70 bg-fuchsia-100/60" />

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
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={translate(language, "emailPlaceholder")}
                autoComplete="username"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">{translate(language, "password")}</label>
              <input
                id="login-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={translate(language, "passwordPlaceholder")}
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500"
              />
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
              <button type="button" className="text-sm font-medium text-slate-400 hover:text-slate-600">
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
