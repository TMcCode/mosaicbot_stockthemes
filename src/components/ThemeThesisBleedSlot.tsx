"use client";

import type { ReactNode } from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

type Props = {
  className?: string;
  children: ReactNode;
};

/** Omits the thesis bleed row for guests (content is auth-gated). */
export function ThemeThesisBleedSlot({ className, children }: Props) {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured || loading || !user) {
    return null;
  }

  return <div className={className}>{children}</div>;
}
