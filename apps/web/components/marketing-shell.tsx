"use client";

import { Bot, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "../lib/utils";
import type { Locale } from "../i18n/routing";

const navLinks = [
  { key: "features", href: "features" },
  { key: "pricing", href: "pricing" },
  { key: "contact", href: "contact" }
] as const;

export function MarketingShell({
  children,
  locale
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const pathname = usePathname();
  const t = useTranslations("marketing");
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080b16]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-500/15 text-blue-300 shadow-glow">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Dubai AI</p>
              <p className="text-sm font-semibold text-white">Business Agent</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((item) => {
              const href = `/${locale}/${item.href}`;
              const active = pathname === href;
              return (
                <Link
                  key={item.key}
                  href={href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition",
                    active ? "text-blue-200" : "text-slate-400 hover:text-white"
                  )}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher locale={locale} />
            <ThemeToggle />
            <Link
              href={`/${locale}/login`}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {t("nav.login")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-blue-400"
            >
              {t("nav.startTrial")}
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="grid gap-2">
              {navLinks.map((item) => (
                <Link
                  key={item.key}
                  href={`/${locale}/${item.href}`}
                  className="rounded-md px-3 py-2 text-sm text-slate-300"
                  onClick={() => setOpen(false)}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <LanguageSwitcher locale={locale} />
                <ThemeToggle />
              </div>
              <Link href={`/${locale}/login`} className="rounded-md px-3 py-2 text-sm">
                {t("nav.login")}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-md bg-blue-500 px-3 py-2 text-center text-sm font-semibold text-white"
              >
                {t("nav.startTrial")}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-500">{t("footer.rights")}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <Link href={`/${locale}/features`}>{t("nav.features")}</Link>
            <Link href={`/${locale}/pricing`}>{t("nav.pricing")}</Link>
            <Link href={`/${locale}/contact`}>{t("nav.contact")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
