import type { ReactNode } from "react";
import { AuthGuard } from "../../../components/auth-guard";
import { AppShell } from "../../../components/app-shell";
import { isLocale, type Locale } from "../../../i18n/routing";

export default async function AppLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return (
    <AuthGuard>
      <AppShell locale={locale}>{children}</AppShell>
    </AuthGuard>
  );
}
