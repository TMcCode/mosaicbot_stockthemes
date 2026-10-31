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
  // Hard <a>: long-tail stocks are served on-demand, not via Next soft-nav.
  return (
    <a
      href={stockPagePath(t)}
      className={className ?? pageStyles.companyNameLink}
      title={name?.trim() ? `${label} stock page` : `${t} stock page`}
    >
      {label}
    </a>
  );
}
