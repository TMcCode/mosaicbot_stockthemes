import Link from "next/link";

import { stockPagePath } from "@/lib/stockPagePath";

import pageStyles from "@/app/page.module.css";

type Props = {
  ticker: string;
  name?: string | null;
  className?: string;
};

/** Company display name → `/stocks/[ticker]` (same destination as TickerBadge). */
export function CompanyNameLink({ ticker, name, className }: Props) {
  const t = ticker.trim();
  const label = name?.trim() || "—";
  if (!t) {
    return (
      <span className={className ?? pageStyles.companyName} title={name?.trim() || undefined}>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={stockPagePath(t)}
      className={className ?? pageStyles.companyNameLink}
      prefetch={false}
      title={name?.trim() ? `${label} stock page` : `${t} stock page`}
    >
      {label}
    </Link>
  );
}
