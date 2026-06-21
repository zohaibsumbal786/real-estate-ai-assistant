"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export default function TeamPage() {
  const t = useTranslations("team");
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SUPPORT_AGENT");

  async function loadUsers() {
    const response = await apiFetch<{ data: TeamUser[] }>("/api/team");
    setUsers(response.data);
  }

  useEffect(() => {
    loadUsers().catch(console.error);
  }, []);

  async function invite() {
    if (!name.trim() || !email.trim()) return;
    await apiFetch("/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ name, email, role })
    });
    setName("");
    setEmail("");
    setRole("SUPPORT_AGENT");
    await loadUsers();
  }

  async function updateRole(userId: string, nextRole: string) {
    await apiFetch(`/api/team/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: nextRole })
    });
    await loadUsers();
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Panel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px_auto]">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("name")} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("email")} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white" />
          <select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
            {["ADMIN", "MANAGER", "SUPPORT_AGENT"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button onClick={invite} type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white shadow-glow">
            <UserPlus className="h-4 w-4" />
            {t("invite")}
          </button>
        </div>
      </Panel>

      <Panel className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                {[t("name"), t("email"), t("role"), t("active")].map((header) => (
                  <th key={header} className="px-4 py-3 text-start font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                  <td className="px-4 py-3 text-slate-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <select value={user.role} onChange={(event) => updateRole(user.id, event.target.value)} className="h-9 rounded-md border border-white/10 bg-slate-950 px-2 text-xs text-white">
                      {["SUPER_ADMIN", "ADMIN", "MANAGER", "SUPPORT_AGENT"].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{user.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
