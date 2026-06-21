"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStoredSession } from "../lib/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getStoredSession()) {
      router.replace(`/${params.locale}/login`);
      return;
    }

    setReady(true);
  }, [params.locale, router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-300">
        Loading secure workspace...
      </div>
    );
  }

  return children;
}
