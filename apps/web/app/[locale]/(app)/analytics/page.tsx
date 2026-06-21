"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Clock3,
  MessageCircle,
  Percent,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { apiFetch } from "../../../../lib/api";
import { formatDuration } from "../../../../lib/utils";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type AnalyticsData = {
  metrics: {
    totalConversations: number;
    conversionRate: number;
    resolutionRate: number;
    avgResponseSeconds: number;
    satisfactionScore: number | null;
    activeCustomers: number;
    inboundMessages: number;
    outboundMessages: number;
  };
  dailyConversations: Array<{ day: string; count: number }>;
  dailyLeads: Array<{ day: string; count: number }>;
  leadStatusBreakdown: Array<{ status: string; count: number }>;
  agentPerformance: Array<{ agentName: string; conversations: number; leadsWon: number }>;
};

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    apiFetch<AnalyticsData>("/api/analytics/overview").then(setData).catch(console.error);
  }, []);

  const metrics = data?.metrics;
  const combinedSeries =
    data?.dailyConversations.map((row) => ({
      day: row.day.slice(5),
      conversations: row.count,
      leads: data.dailyLeads.find((lead) => lead.day === row.day)?.count ?? 0
    })) ?? [];

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("conversations"), value: metrics?.totalConversations ?? 0, icon: MessageCircle },
          { label: t("conversion"), value: `${metrics?.conversionRate ?? 0}%`, icon: Percent },
          { label: t("responseTime"), value: formatDuration(metrics?.avgResponseSeconds ?? 0), icon: Clock3 },
          { label: t("satisfaction"), value: metrics?.satisfactionScore ?? "-", icon: Star },
          { label: t("activeCustomers"), value: metrics?.activeCustomers ?? 0, icon: Users },
          { label: t("resolution"), value: `${metrics?.resolutionRate ?? 0}%`, icon: TrendingUp },
          { label: t("inbound"), value: metrics?.inboundMessages ?? 0, icon: BarChart3 },
          { label: t("outbound"), value: metrics?.outboundMessages ?? 0, icon: BarChart3 }
        ].map((metric) => (
          <Panel key={metric.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{metric.label}</p>
              <metric.icon className="h-4 w-4 text-blue-300" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{metric.value}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("trend")}</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedSeries}>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Bar dataKey="conversations" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("agentPerformance")}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2 text-start">{t("agent")}</th>
                  <th className="px-2 py-2 text-start">{t("conversations")}</th>
                  <th className="px-2 py-2 text-start">{t("leadsWon")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.agentPerformance ?? []).map((agent) => (
                  <tr key={agent.agentName} className="border-t border-white/10">
                    <td className="px-2 py-3 text-white">{agent.agentName}</td>
                    <td className="px-2 py-3 text-slate-300">{agent.conversations}</td>
                    <td className="px-2 py-3 text-slate-300">{agent.leadsWon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
