"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { buildSignInHref } from "@/lib/authRedirect";

/**
 * Sign-in URL that returns to the current page after auth.
 * Uses pathname on first paint; appends `window.location.search` after mount
 * (avoids `useSearchParams` Suspense on every page).
 */
export function useReturnToSignInHref(): string {
  const pathname = usePathname() || "/";
  const [href, setHref] = useState(() => buildSignInHref(pathname));

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    setHref(buildSignInHref(`${pathname}${search}`));
  }, [pathname]);

  return href;
}
