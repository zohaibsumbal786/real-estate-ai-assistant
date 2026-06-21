"use client";

import {
  BarChart3,
  Bot,
  BookOpen,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Sparkles,
  Users,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { clearSession, getStoredSession } from "../lib/api";
import { cn } from "../lib/utils";
import type { Locale } from "../i18n/routing";

const navItems = [
  { key: "dashboard", href: "dashboard", icon: LayoutDashboard },
  { key: "leads", href: "leads", icon: WalletCards },
  { key: "conversations", href: "conversations", icon: MessageSquareText },
  { key: "appointments", href: "appointments", icon: CalendarCheck },
  { key: "knowledge", href: "knowledge", icon: BookOpen },
  { key: "analytics", href: "analytics", icon: BarChart3 },
  { key: "team", href: "team", icon: Users },
  { key: "billing", href: "billing", icon: CreditCard },
  { key: "settings", href: "settings", icon: Settings }
] as const;

export function AppShell({
  children,
  locale
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const session = getStoredSession();

  function logout() {
    clearSession();
    router.replace(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen text-slate-100">
      <aside className="fixed inset-y-0 z-30 hidden w-72 border-white/10 bg-[#080b16]/80 p-5 shadow-panel backdrop-blur-xl ltr:left-0 ltr:border-r rtl:right-0 rtl:border-l lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-blue-500/15 text-blue-300 shadow-glow">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Dubai AI</p>
            <h1 className="text-base font-semibold text-white">Business Agent</h1>
          </div>
        </div>

        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = `/${locale}/${item.href}`;
            const active = pathname === href;
            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                  active
                    ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-5 bottom-5 rounded-md border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Sparkles className="h-4 w-4 text-purple-300" />
            {session?.organization.name ?? "Demo SME LLC"}
          </div>
          <p className="mt-2 text-xs text-slate-500">{session?.user.email}</p>
        </div>
      </aside>

      <div className="lg:ltr:pl-72 lg:rtl:pr-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b16]/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-300">
                Operator workspace
              </p>
              <p className="truncate text-sm text-slate-400">
                {session?.user.name ?? "Demo Admin"} / {session?.user.role ?? "ADMIN"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher locale={locale} />
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                title={t("logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
