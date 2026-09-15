import { HELLO_EMAIL } from "@/lib/contactEmails";
import {
  WATCHLIST_FREE_PLAN_LINE,
  watchlistLimitInterestMailto,
} from "@/lib/watchlist/limitsCopy";

type Props = {
  /** Prefixed plan sentence (account / sign-in). */
  includePlanLine?: boolean;
  className?: string;
};

/**
 * Honest “no paid tier yet” note with mailto waitlist interest.
 */
export function WatchlistLimitInterestNote({ includePlanLine = false, className }: Props) {
  return (
    <p className={className}>
      {includePlanLine ? (
        <>
          {WATCHLIST_FREE_PLAN_LINE}{" "}
        </>
      ) : null}
      Interested in more?{" "}
      <a href={watchlistLimitInterestMailto()}>Email {HELLO_EMAIL}</a>.
    </p>
  );
}
