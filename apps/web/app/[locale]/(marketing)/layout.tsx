import type { ReactNode } from "react";
import { MarketingShell } from "../../../components/marketing-shell";
import { isLocale, type Locale } from "../../../i18n/routing";

export default async function MarketingLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return <MarketingShell locale={locale}>{children}</MarketingShell>;
}
