"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type Locale } from "../i18n/routing";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    router.push(segments.join("/"));
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
      title={nextLocale === "ar" ? "Arabic" : "English"}
    >
      <Languages className="h-4 w-4" />
    </button>
  );
}
