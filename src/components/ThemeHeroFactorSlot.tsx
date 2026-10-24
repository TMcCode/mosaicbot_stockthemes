"use client";

import type { ReactNode } from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

type Props = {
  className?: string;
  children: ReactNode;
};

/** Omits the factor grid cell for guests so the hero doesn’t leave a blank stretch. */
export function ThemeHeroFactorSlot({ className, children }: Props) {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured || loading || !user) {
    return null;
  }

  return <div className={className}>{children}</div>;
}
