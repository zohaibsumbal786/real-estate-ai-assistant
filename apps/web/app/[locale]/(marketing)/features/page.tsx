import {
  BarChart3,
  Bot,
  Brain,
  CalendarCheck,
  Globe2,
  MessageSquareText,
  Shield,
  Users,
  Zap
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

const featureItems = [
  { icon: MessageSquareText, key: "whatsapp" },
  { icon: Globe2, key: "multilingual" },
  { icon: Zap, key: "leads" },
  { icon: CalendarCheck, key: "booking" },
  { icon: Brain, key: "rag" },
  { icon: Bot, key: "sales" },
  { icon: BarChart3, key: "analytics" },
  { icon: Users, key: "team" },
  { icon: Shield, key: "security" }
] as const;

export default async function FeaturesPage() {
  const t = await getTranslations("marketing.featuresPage");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureItems.map((item) => {
          const Icon = item.icon;
          return (
            <Panel key={item.key} className="p-6">
              <Icon className="h-6 w-6 text-blue-300" />
              <h3 className="mt-4 text-lg font-semibold text-white">{t(`items.${item.key}.title`)}</h3>
              <p className="mt-2 text-sm text-slate-400">{t(`items.${item.key}.body`)}</p>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
