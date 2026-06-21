"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type Organization = {
  name: string;
  phone?: string;
  timezone: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
};

const defaultHours = [
  { dayOfWeek: 0, opensAt: "09:00", closesAt: "18:00", slotMinutes: 30, isActive: false },
  { dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", slotMinutes: 30, isActive: true },
  { dayOfWeek: 2, opensAt: "09:00", closesAt: "18:00", slotMinutes: 30, isActive: true },
  { dayOfWeek: 3, opensAt: "09:00", closesAt: "18:00", slotMinutes: 30, isActive: true },
  { dayOfWeek: 4, opensAt: "09:00", closesAt: "18:00", slotMinutes: 30, isActive: true },
  { dayOfWeek: 5, opensAt: "09:00", closesAt: "18:00", slotMinutes: 30, isActive: true },
  { dayOfWeek: 6, opensAt: "10:00", closesAt: "16:00", slotMinutes: 30, isActive: false }
];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [org, setOrg] = useState<Organization>({
    name: "",
    timezone: "Asia/Dubai"
  });
  const [hours, setHours] = useState(defaultHours);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: Organization }>("/api/settings/organization"),
      apiFetch<{ data: typeof defaultHours }>("/api/settings/business-hours")
    ])
      .then(([orgResponse, hoursResponse]) => {
        setOrg(orgResponse.data);
        if (hoursResponse.data.length > 0) {
          setHours(hoursResponse.data);
        }
      })
      .catch(console.error);
  }, []);

  async function save() {
    try {
      setLoading(true);
      setMessage("");
      await apiFetch("/api/settings/organization", {
        method: "PATCH",
        body: JSON.stringify(org)
      });
      await apiFetch("/api/settings/business-hours", {
        method: "PUT",
        body: JSON.stringify(hours)
      });
      setMessage(t("saved"));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("organization")}</h2>
          <div className="mt-4 grid gap-3">
            {[
              { key: "name", label: t("orgName") },
              { key: "phone", label: t("phone") },
              { key: "timezone", label: t("timezone") },
              { key: "whatsappPhoneNumberId", label: t("whatsappPhoneId") },
              { key: "whatsappBusinessAccountId", label: t("whatsappAccountId") }
            ].map((field) => (
              <label key={field.key} className="grid gap-2 text-sm text-slate-300">
                {field.label}
                <input
                  value={(org as Record<string, string>)[field.key] ?? ""}
                  onChange={(event) =>
                    setOrg((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-white"
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("businessHours")}</h2>
          <div className="mt-4 grid gap-2">
            {hours.map((entry, index) => (
              <div key={entry.dayOfWeek} className="grid grid-cols-[60px_1fr_1fr_auto] items-center gap-2">
                <span className="text-sm text-slate-400">{dayLabels[entry.dayOfWeek]}</span>
                <input
                  value={entry.opensAt}
                  onChange={(event) => {
                    const next = [...hours];
                    next[index] = { ...entry, opensAt: event.target.value };
                    setHours(next);
                  }}
                  className="h-9 rounded-md border border-white/10 bg-slate-950 px-2 text-sm text-white"
                />
                <input
                  value={entry.closesAt}
                  onChange={(event) => {
                    const next = [...hours];
                    next[index] = { ...entry, closesAt: event.target.value };
                    setHours(next);
                  }}
                  className="h-9 rounded-md border border-white/10 bg-slate-950 px-2 text-sm text-white"
                />
                <input
                  type="checkbox"
                  checked={entry.isActive}
                  onChange={(event) => {
                    const next = [...hours];
                    next[index] = { ...entry, isActive: event.target.checked };
                    setHours(next);
                  }}
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white"
      >
        <Save className="h-4 w-4" />
        {loading ? "..." : t("save")}
      </button>
    </div>
  );
}
