"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

export function HomeWatchlistCtaLink() {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return (
      <Link href="/my">Create Your Own Themes Watchlist</Link>
    );
  }

  const href = user ? "/my" : "/sign-in?next=%2Fmy";

  return (
    <Link href={href} aria-busy={loading || undefined}>
      Create Your Own Themes Watchlist
    </Link>
  );
}
