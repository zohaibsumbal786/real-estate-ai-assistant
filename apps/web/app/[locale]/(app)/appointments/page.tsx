"use client";

import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type Appointment = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  location?: string;
  customer?: { name?: string; phone: string };
};

export default function AppointmentsPage() {
  const t = useTranslations("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    location: ""
  });

  function load() {
    apiFetch<{ data: Appointment[] }>("/api/appointments")
      .then((response) => setAppointments(response.data))
      .catch(console.error);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    await apiFetch("/api/appointments", {
      method: "POST",
      body: JSON.stringify(form)
    });
    setForm({ title: "", startsAt: "", endsAt: "", location: "" });
    load();
  }

  async function cancel(id: string) {
    await apiFetch(`/api/appointments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Panel className="mb-4 p-5">
        <h2 className="text-sm font-semibold text-white">{t("create")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder={t("titleField")}
            className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          />
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
            className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          />
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
            className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          />
          <input
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            placeholder={t("location")}
            className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          />
        </div>
        <button
          type="button"
          onClick={create}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white"
        >
          <CalendarPlus className="h-4 w-4" />
          {t("createButton")}
        </button>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start">{t("titleField")}</th>
                <th className="px-4 py-3 text-start">{t("customer")}</th>
                <th className="px-4 py-3 text-start">{t("starts")}</th>
                <th className="px-4 py-3 text-start">{t("status")}</th>
                <th className="px-4 py-3 text-start">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white">{appointment.title}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {appointment.customer?.name ?? appointment.customer?.phone ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(appointment.startsAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{appointment.status}</td>
                  <td className="px-4 py-3">
                    {appointment.status !== "CANCELLED" ? (
                      <button
                        type="button"
                        onClick={() => cancel(appointment.id)}
                        className="text-sm text-rose-300 hover:text-rose-200"
                      >
                        {t("cancel")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
