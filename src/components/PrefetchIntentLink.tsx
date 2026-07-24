"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, type ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch">;

/**
 * Link that prefetches on hover / focus intent instead of on viewport entry.
 *
 * Default App Router prefetch fires for every visible link, so site-wide nav and footer
 * links pull an RSC tree (~4 requests each) for pages nobody opens. Same pattern as
 * `ThemesProgressiveList` / `SiteSearch`.
 */
export function PrefetchIntentLink({ href, onMouseEnter, onFocus, ...rest }: Props) {
  const router = useRouter();
  const prefetchedRef = useRef(false);

  const prefetchOnIntent = useCallback(() => {
    if (prefetchedRef.current) return;
    const raw = typeof href === "string" ? href : (href?.pathname ?? "");
    const target = raw.split("#")[0];
    if (!target) return;
    prefetchedRef.current = true;
    void router.prefetch(target);
  }, [href, router]);

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        prefetchOnIntent();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetchOnIntent();
        onFocus?.(e);
      }}
    />
  );
}
