"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Clock3, MessageCircle, Siren, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { formatDuration } from "../../../../lib/utils";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type DashboardData = {
  metrics: {
    conversationsTotal: number;
    conversationsOpen: number;
    needsHuman: number;
    leadsWon: number;
    leadCount: number;
    averageResponseSeconds: number;
  };
  series: Array<{ day: string; conversations: number; leads: number }>;
  recentMessages: Array<{
    id: string;
    body: string;
    customer?: { name?: string; phone: string };
    createdAt: string;
  }>;
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard/overview").then(setData).catch(console.error);
  }, []);

  const metrics = data?.metrics;

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: t("conversations"), value: metrics?.conversationsTotal ?? 0, icon: MessageCircle },
          { label: t("open"), value: metrics?.conversationsOpen ?? 0, icon: Activity },
          { label: t("needsHuman"), value: metrics?.needsHuman ?? 0, icon: Siren },
          { label: t("leadsWon"), value: metrics?.leadsWon ?? 0, icon: Trophy },
          { label: t("avgResponse"), value: formatDuration(metrics?.averageResponseSeconds ?? 0), icon: Clock3 }
        ].map((metric) => (
          <Panel key={metric.label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{metric.label}</p>
              <metric.icon className="h-4 w-4 text-blue-300" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">{metric.value}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("activity")}</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series ?? []}>
                <defs>
                  <linearGradient id="conversations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="leads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Area type="monotone" dataKey="conversations" stroke="#60a5fa" fill="url(#conversations)" />
                <Area type="monotone" dataKey="leads" stroke="#a78bfa" fill="url(#leads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("recent")}</h2>
          <div className="mt-4 grid gap-3">
            {(data?.recentMessages ?? []).map((message) => (
              <div key={message.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium text-white">
                  {message.customer?.name ?? message.customer?.phone}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{message.body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
