"use client";

import { useState } from "react";
import { Bot, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch, register, storeSession } from "../../../lib/api";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double submissions

  async function submit() {
    // Prevent double submission
    if (isSubmitting || loading) return;
    setIsSubmitting(true);
    try {
      setError("");
      setLoading(true);
      const session = await register({ organizationName, name, email, password });
      storeSession(session);
      const plan = searchParams.get("plan");
      if (plan && plan !== "free-trial") {
        await apiFetch("/api/billing/checkout", {
          method: "POST",
          body: JSON.stringify({ planSlug: plan })
        }).catch(console.error);
      }
      router.replace(`/${params.locale}/dashboard`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-slate-950/70 p-6 shadow-panel backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-blue-500/15 text-blue-300 shadow-glow">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t("registerTitle")}</h1>
            <p className="mt-1 text-sm text-slate-400">{t("registerSubtitle")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-300">
            {t("organizationName")}
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:ring-2 focus:ring-blue-400/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            {t("name")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:ring-2 focus:ring-blue-400/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            {t("email")}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:ring-2 focus:ring-blue-400/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:ring-2 focus:ring-blue-400/40"
            />
          </label>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={loading || isSubmitting || !organizationName || !name || !email || !password}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white shadow-glow disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            <ShieldCheck className="h-4 w-4" />
            {loading ? t("creating") || "Creating account..." : t("register")}
          </button>
          <p className="text-center text-sm text-slate-400">
            {t("hasAccount")}{" "}
            <Link href={`/${params.locale}/login`} className="text-blue-300 hover:text-blue-200">
              {t("signIn")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
