"use client";

import { useState } from "react";
import { Bot, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { login, storeSession } from "../../../lib/api";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const [email, setEmail] = useState("admin@demo.ae");
  const [password, setPassword] = useState("DemoPass123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setError("");
      setLoading(true);
      const session = await login(email, password);
      storeSession(session);
      router.replace(`/${params.locale}/dashboard`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed");
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
            <h1 className="text-xl font-semibold text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-300">
            {t("email")}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none ring-blue-400/0 transition focus:ring-2"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none ring-blue-400/0 transition focus:ring-2"
            />
          </label>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-blue-400 disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {loading ? "..." : t("signIn")}
          </button>
          <p className="text-center text-sm text-slate-400">
            {t("noAccount")}{" "}
            <Link href={`/${params.locale}/register`} className="text-blue-300 hover:text-blue-200">
              {t("register")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
