import raw from "@/data/signup_stats.v0.json";
import type { SignupStatsV0 } from "@/types/signup_stats.v0";

function parseSignupStats(data: unknown): SignupStatsV0 | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.schema_version !== "signup_stats.v0") return null;
  if (typeof o.available !== "boolean") return null;
  const count = Number(o.sign_up_count);
  if (!Number.isFinite(count) || count < 0) return null;
  return {
    schema_version: "signup_stats.v0",
    available: o.available,
    sign_up_count: count,
    as_of: typeof o.as_of === "string" ? o.as_of : "",
    next_update_at: typeof o.next_update_at === "string" ? o.next_update_at : "",
    update_schedule_note:
      typeof o.update_schedule_note === "string" ? o.update_schedule_note : "",
  };
}

/** Build-time JSON only — no runtime fetch. */
export function getSignupStatsBaked(): SignupStatsV0 | null {
  return parseSignupStats(raw);
}
