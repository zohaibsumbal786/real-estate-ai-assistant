"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

const plans = [
  {
    slug: "free-trial",
    price: 0,
    yearlyPrice: 0,
    highlight: false,
    features: ["500 messages", "1 seat", "5 knowledge docs", "14-day trial"]
  },
  {
    slug: "starter",
    price: 299,
    yearlyPrice: 2990,
    highlight: false,
    features: ["3,000 messages", "3 seats", "50 knowledge docs", "Lead capture", "Basic analytics"]
  },
  {
    slug: "professional",
    price: 699,
    yearlyPrice: 6990,
    highlight: true,
    features: ["15,000 messages", "10 seats", "250 knowledge docs", "Appointments", "Advanced analytics"]
  },
  {
    slug: "enterprise",
    price: 1499,
    yearlyPrice: 14990,
    highlight: false,
    features: ["50,000 messages", "30 seats", "1,000 knowledge docs", "Priority support", "Custom integrations"]
  }
] as const;

export default function PricingPage() {
  const t = useTranslations("marketing.pricing");
  const params = useParams<{ locale: string }>();
  const [yearly, setYearly] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-md border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-md px-4 py-2 text-sm ${!yearly ? "bg-blue-500 text-white" : "text-slate-400"}`}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`rounded-md px-4 py-2 text-sm ${yearly ? "bg-blue-500 text-white" : "text-slate-400"}`}
          >
            {t("yearly")} ({t("save")})
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {plans.map((plan) => (
          <Panel
            key={plan.slug}
            className={`flex flex-col p-6 ${plan.highlight ? "ring-2 ring-blue-400/40" : ""}`}
          >
            {plan.highlight ? (
              <span className="mb-3 w-fit rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-200">
                {t("popular")}
              </span>
            ) : null}
            <h3 className="text-lg font-semibold text-white">{t(`plans.${plan.slug}.name`)}</h3>
            <p className="mt-2 text-sm text-slate-400">{t(`plans.${plan.slug}.description`)}</p>
            <p className="mt-6 text-3xl font-bold text-white">
              AED {yearly ? plan.yearlyPrice : plan.price}
              <span className="text-sm font-normal text-slate-400">
                /{yearly ? t("year") : t("month")}
              </span>
            </p>
            <ul className="mt-6 grid flex-1 gap-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={`/${params.locale}/register?plan=${plan.slug}`}
              className={`mt-6 inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold ${
                plan.highlight
                  ? "bg-blue-500 text-white shadow-glow hover:bg-blue-400"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {t("cta")}
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
