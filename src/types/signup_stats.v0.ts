export type SignupStatsV0 = {
  schema_version: "signup_stats.v0";
  /** False when count was not fetched (local dev / missing service role). */
  available: boolean;
  sign_up_count: number;
  /** ISO-8601 UTC when the count was fetched. */
  as_of: string;
  /** ISO-8601 UTC — next daily deploy window used for the banner label. */
  next_update_at: string;
  update_schedule_note: string;
};
