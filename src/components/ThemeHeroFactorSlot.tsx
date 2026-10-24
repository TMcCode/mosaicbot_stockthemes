"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ThemeAuthGateSkeleton } from "@/components/ThemeAuthGateSkeleton";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

/** Matches thesis mobile deck — factor card is desktop-only when thesis embeds it. */
const DESKTOP_FACTOR_MQ = "(min-width: 1101px)";

type Props = {
  className?: string;
  children: ReactNode;
  /**
   * When true, do not mount children on mobile (≤1100px). Used when Factor Profile
   * already lives in the thesis deck — CSS `display:none` alone still hydrates the card.
   */
  desktopOnly?: boolean;
};

/** Omits the factor grid cell for guests so the hero doesn’t leave a blank stretch. */
export function ThemeHeroFactorSlot({ className, children, desktopOnly = false }: Props) {
  const { configured, loading, showAuthedUi, presumeSignedIn } = useSupabaseAuth();
  // desktopOnly: stay unmounted until we know viewport (avoids mobile double-load).
  const [allowMount, setAllowMount] = useState(!desktopOnly);

  useEffect(() => {
    if (!desktopOnly) {
      setAllowMount(true);
      return;
    }
    const mq = window.matchMedia(DESKTOP_FACTOR_MQ);
    const sync = () => setAllowMount(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [desktopOnly]);

  if (!configured) {
    return null;
  }

  if (desktopOnly && !allowMount) {
    return null;
  }

  if (showAuthedUi) {
    return <div className={className}>{children}</div>;
  }

  if (loading && !presumeSignedIn) {
    return null;
  }

  if (loading) {
    return <ThemeAuthGateSkeleton className={className} variant="factor" />;
  }

  return null;
}
