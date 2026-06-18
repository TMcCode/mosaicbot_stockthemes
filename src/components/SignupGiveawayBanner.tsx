import Script from "next/script";

import { SignupGiveawayBannerClient } from "@/components/SignupGiveawayBannerClient";
import {
  formatGiveawayEntriesCloseLabel,
  formatGiveawayWinnerChosenLabel,
  GIVEAWAY_ENTRIES_CLOSE_DATE,
  giveawayBannerDismissScriptContent,
  giveawayEntriesOpen,
  giveawayPledgedDollars,
  giveawaySignupsToNextTier,
} from "@/lib/giveawayConfig";
import { getSignupStatsBaked } from "@/lib/loadSignupStats";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function formatNextUpdateLabel(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

/**
 * Static giveaway strip — count baked at build; no client fetch.
 * Hidden after Jul 31, 2026 ET: checked at static export time (each deploy).
 */
export function SignupGiveawayBanner() {
  if (!getSupabasePublicConfig()) return null;
  if (!giveawayEntriesOpen()) return null;

  const stats = getSignupStatsBaked();
  if (!stats?.available) return null;

  const pledged = giveawayPledgedDollars(stats.sign_up_count);
  const toNext = giveawaySignupsToNextTier(stats.sign_up_count);
  const nextUpdate = formatNextUpdateLabel(stats.next_update_at);
  const closeLabel = formatGiveawayEntriesCloseLabel();
  const winnerLabel = formatGiveawayWinnerChosenLabel();

  return (
    <>
      <Script
        id="signup-giveaway-dismiss"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: giveawayBannerDismissScriptContent() }}
      />
      <Script
        id="signup-giveaway-deadline"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var c=${JSON.stringify(GIVEAWAY_ENTRIES_CLOSE_DATE)};var t=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York"}).format(new Date());if(t>c){var el=document.getElementById("signup-giveaway-banner");if(el)el.remove();}}catch(e){}})();`,
        }}
      />
      <SignupGiveawayBannerClient
        signUpCount={stats.sign_up_count}
        pledged={pledged}
        toNext={toNext}
        nextUpdate={nextUpdate}
        closeLabel={closeLabel}
        winnerLabel={winnerLabel}
        updateScheduleNote={stats.update_schedule_note}
      />
    </>
  );
}
