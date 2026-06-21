"use client";

import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

export default function ContactPage() {
  const t = useTranslations("marketing.contact");
  const params = useParams<{ locale: string }>();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: ""
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit() {
    try {
      setStatus("loading");
      setError("");
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale: params.locale })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        throw new Error(body?.error?.message ?? "Failed to send message");
      }
      setStatus("success");
      setForm({ name: "", email: "", company: "", phone: "", message: "" });
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Failed to send message");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-white">{t("infoTitle")}</h2>
          <div className="mt-6 grid gap-4 text-sm text-slate-300">
            <p className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-blue-300" />
              Dubai Internet City, Dubai, UAE
            </p>
            <p className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-blue-300" />
              hello@dubai-ai-agent.ae
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-blue-300" />
              +971 4 000 0000
            </p>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="grid gap-4">
            {[
              { key: "name", label: t("name") },
              { key: "email", label: t("email"), type: "email" },
              { key: "company", label: t("company") },
              { key: "phone", label: t("phone") }
            ].map((field) => (
              <label key={field.key} className="grid gap-2 text-sm text-slate-300">
                {field.label}
                <input
                  type={field.type ?? "text"}
                  value={form[field.key as keyof typeof form]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 text-white outline-none focus:ring-2 focus:ring-blue-400/40"
                />
              </label>
            ))}
            <label className="grid gap-2 text-sm text-slate-300">
              {t("message")}
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                rows={5}
                className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {status === "success" ? (
              <p className="text-sm text-emerald-300">{t("success")}</p>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={status === "loading"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {status === "loading" ? "..." : t("submit")}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
