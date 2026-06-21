"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  score: number;
  status: string;
  assignedTo?: { id: string; name: string };
};

type User = { id: string; name: string; role: string };

export default function LeadsPage() {
  const t = useTranslations("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState("0");
  const [agent, setAgent] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (minScore) params.set("minScore", minScore);
    if (agent) params.set("assignedToId", agent);
    return params.toString();
  }, [agent, minScore, status]);

  useEffect(() => {
    apiFetch<{ data: User[] }>("/api/team").then((response) => setTeam(response.data)).catch(console.error);
  }, []);

  useEffect(() => {
    apiFetch<{ data: Lead[] }>(`/api/leads?${query}`).then((response) => setLeads(response.data)).catch(console.error);
  }, [query]);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Panel className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
            <option value="">{t("all")} {t("status")}</option>
            {["NEW", "QUALIFIED", "CONTACTED", "PROPOSAL_SENT", "WON", "LOST"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input value={minScore} onChange={(event) => setMinScore(event.target.value)} placeholder={t("minScore")} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white" />
          <select value={agent} onChange={(event) => setAgent(event.target.value)} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
            <option value="">{t("all")} {t("agent")}</option>
            {team.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
      </Panel>

      <Panel className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                {[t("name"), t("phone"), "Email", t("company"), t("score"), t("status"), t("agent")].map((header) => (
                  <th key={header} className="px-4 py-3 text-start font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-white">{lead.name}</td>
                  <td className="px-4 py-3 text-slate-300">{lead.phone}</td>
                  <td className="px-4 py-3 text-slate-300">{lead.email ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{lead.company ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-blue-500/15 px-2 py-1 text-blue-200">{lead.score}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{lead.status}</td>
                  <td className="px-4 py-3 text-slate-300">{lead.assignedTo?.name ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
