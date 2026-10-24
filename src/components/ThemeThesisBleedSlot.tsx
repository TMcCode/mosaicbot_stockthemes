"use client";

import type { ReactNode } from "react";

import { ThemeAuthGateSkeleton } from "@/components/ThemeAuthGateSkeleton";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

type Props = {
  className?: string;
  children: ReactNode;
};

/** Omits the thesis bleed row for guests (content is auth-gated). */
export function ThemeThesisBleedSlot({ className, children }: Props) {
  const { configured, loading, showAuthedUi, presumeSignedIn } = useSupabaseAuth();

  if (!configured) {
    return null;
  }

  if (showAuthedUi) {
    return <div className={className}>{children}</div>;
  }

  // No stored session → treat as guest (unlock hint covers this). Avoid skeleton flash.
  if (loading && !presumeSignedIn) {
    return null;
  }

  if (loading) {
    return <ThemeAuthGateSkeleton className={className} variant="thesis" />;
  }

  return null;
}
