"use client";

import Link from "next/link";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

export function HomeWatchlistCtaLink() {
  const { configured, loading, user } = useSupabaseAuth();

  if (!configured) {
    return (
      <Link href="/radar?tab=watchlist">Create Your Own Themes Watchlist</Link>
    );
  }

  const href = user ? "/radar?tab=watchlist" : "/sign-in?next=%2Fradar%3Ftab%3Dwatchlist";

  return (
    <Link href={href} aria-busy={loading || undefined}>
      Create Your Own Themes Watchlist
    </Link>
  );
}
