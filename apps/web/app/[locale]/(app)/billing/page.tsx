"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  monthlyPriceAED: number;
  messageLimit: number;
  seatLimit: number;
  knowledgeDocumentLimit: number;
  features: string[];
};

type Subscription = {
  status: string;
  currentPeriodEnd: string;
  plan: Plan;
};

export default function BillingPage() {
  const t = useTranslations("billing");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: Plan[] }>("/api/billing/plans"),
      apiFetch<{ data: Subscription | null }>("/api/billing/subscription")
    ])
      .then(([plansResponse, subscriptionResponse]) => {
        setPlans(plansResponse.data);
        setSubscription(subscriptionResponse.data);
      })
      .catch(console.error);
  }, []);

  async function checkout(planSlug: string) {
    try {
      setLoading(planSlug);
      setMessage("");
      const response = await apiFetch<{ url?: string; mock?: boolean }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planSlug })
      });
      if (response.url && !response.mock) {
        window.location.href = response.url;
        return;
      }
      setMessage(t("upgraded"));
      const refreshed = await apiFetch<{ data: Subscription | null }>("/api/billing/subscription");
      setSubscription(refreshed.data);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {subscription ? (
        <Panel className="mb-4 p-5">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-blue-300" />
            <div>
              <p className="text-sm text-slate-400">{t("currentPlan")}</p>
              <p className="text-lg font-semibold text-white">
                {subscription.plan.name} — {subscription.status}
              </p>
              <p className="text-sm text-slate-400">
                {t("renews")}: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      {message ? <p className="mb-4 text-sm text-emerald-300">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {plans.map((plan) => {
          const active = subscription?.plan.slug === plan.slug;
          return (
            <Panel key={plan.id} className={`flex flex-col p-5 ${active ? "ring-2 ring-blue-400/40" : ""}`}>
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold text-white">
                AED {plan.monthlyPriceAED}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </p>
              <ul className="mt-4 grid flex-1 gap-2 text-sm text-slate-300">
                <li>{plan.messageLimit.toLocaleString()} messages</li>
                <li>{plan.seatLimit} seats</li>
                <li>{plan.knowledgeDocumentLimit} knowledge docs</li>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    {feature.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={active || loading === plan.slug}
                onClick={() => checkout(plan.slug)}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {active ? t("active") : loading === plan.slug ? "..." : t("upgrade")}
              </button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
