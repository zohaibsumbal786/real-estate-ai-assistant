import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Globe2,
  MessageSquareText,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isLocale, type Locale } from "../../../i18n/routing";
import { Panel } from "../../../components/panel";

export default async function LandingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const t = await getTranslations("marketing");

  const features = [
    { icon: MessageSquareText, title: t("features.whatsapp.title"), body: t("features.whatsapp.body") },
    { icon: Globe2, title: t("features.multilingual.title"), body: t("features.multilingual.body") },
    { icon: TrendingUp, title: t("features.leads.title"), body: t("features.leads.body") },
    { icon: CalendarCheck, title: t("features.booking.title"), body: t("features.booking.body") },
    { icon: Sparkles, title: t("features.rag.title"), body: t("features.rag.body") },
    { icon: Users, title: t("features.team.title"), body: t("features.team.body") }
  ];

  const industries = [
    t("industries.realEstate"),
    t("industries.restaurants"),
    t("industries.clinics"),
    t("industries.salons"),
    t("industries.travel"),
    t("industries.ecommerce"),
    t("industries.carRental"),
    t("industries.sme")
  ];

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-blue-300">{t("hero.badge")}</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-400">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/register`}
                className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-blue-400"
              >
                {t("hero.ctaPrimary")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/pricing`}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
          </div>

          <Panel className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-blue-500/15 text-blue-300">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">{t("hero.previewLabel")}</p>
                <p className="font-semibold text-white">{t("hero.previewTitle")}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                {t("hero.sampleInbound")}
              </div>
              <div className="rounded-md border border-blue-400/20 bg-blue-500/10 p-3 text-sm text-blue-100 ltr:ml-8 rtl:mr-8">
                {t("hero.sampleReply")}
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-white">{t("industries.title")}</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {industries.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-semibold text-white">{t("features.title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">{t("features.subtitle")}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Panel key={feature.title} className="p-5">
                <Icon className="h-5 w-5 text-blue-300" />
                <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{feature.body}</p>
              </Panel>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Panel className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">{t("cta.title")}</h2>
            <p className="mt-2 max-w-xl text-slate-400">{t("cta.subtitle")}</p>
          </div>
          <Link
            href={`/${locale}/register`}
            className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-glow"
          >
            {t("cta.button")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Panel>
      </section>
    </div>
  );
}
