#!/usr/bin/env node
/**
 * Fetches Supabase auth user count at build time and writes src/data/signup_stats.v0.json.
 * Requires SUPABASE_SERVICE_ROLE_KEY (never exposed to the browser).
 * Skips quietly when the service role key is missing (local dev keeps the committed fallback).
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "src", "data", "signup_stats.v0.json");

const UPDATE_SCHEDULE_NOTE =
  "Sign-up count refreshes after each scheduled site deploy (typically ~5 AM ET on days the site rebuilds).";

/** Next daily GitHub Pages deploy window (09:00 UTC cron). */
function nextDailyDeployUtc(from = new Date()) {
  const d = new Date(from);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(0);
  d.setUTCHours(9);
  if (d.getTime() <= from.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function formatNextUpdateEt(isoUtc) {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

async function countAuthUsers(supabase) {
  let total = 0;
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users ?? [];
    total += batch.length;
    if (batch.length < perPage) break;
    page += 1;
    if (page > 500) {
      console.warn("fetch-signup-stats: stopped after 500k users");
      break;
    }
  }
  return total;
}

function giveawayEntriesOpen(now = new Date()) {
  const closeDate = "2026-07-31";
  const todayEt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  return todayEt <= closeDate;
}

async function main() {
  if (!giveawayEntriesOpen()) {
    console.log("fetch-signup-stats: skipped (giveaway entries closed after Jul 31, 2026 ET)");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.log(
      "fetch-signup-stats: skipped (set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to refresh count)",
    );
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signUpCount = await countAuthUsers(supabase);
  const asOf = new Date();
  const nextDeploy = nextDailyDeployUtc(asOf);

  const payload = {
    schema_version: "signup_stats.v0",
    available: true,
    sign_up_count: signUpCount,
    as_of: asOf.toISOString(),
    next_update_at: nextDeploy.toISOString(),
    update_schedule_note: UPDATE_SCHEDULE_NOTE,
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    `fetch-signup-stats: wrote ${signUpCount} sign-ups (next deploy ~${formatNextUpdateEt(nextDeploy.toISOString())})`,
  );
}

main().catch((err) => {
  console.error("fetch-signup-stats failed:", err);
  process.exit(1);
});
