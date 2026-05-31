import { getBrowserSupabase } from "@/lib/supabase/browserClient";

import type { ThemeIdeaPayload } from "@/lib/themeIdeas/payload";

export type { ThemeIdeaSubmissionStatus } from "@/lib/themeIdeas/types";

/** Persists a submission for contributor tracking (RLS: own rows only). */
export async function recordThemeIdeaSubmission(
  userId: string,
  payload: ThemeIdeaPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { ok: false, error: "Sign-in storage is not configured." };
  }

  const insert =
    payload.kind === "new_group"
      ? supabase.from("theme_idea_submissions").insert({
          user_id: userId,
          kind: "new_group",
          submitter_email: payload.submitterEmail,
          status: "submitted",
          proposed_group_name: payload.groupName,
          theme_names: payload.themeNames,
          group_note: payload.groupNote,
        })
      : payload.kind === "theme_edit"
        ? supabase.from("theme_idea_submissions").insert({
            user_id: userId,
            kind: "theme_edit",
            submitter_email: payload.submitterEmail,
            status: "submitted",
            theme_slug: payload.themeSlug,
            proposed_theme_name: payload.themeName,
            tickers_to_remove:
              payload.tickersToRemove.length > 0 ? payload.tickersToRemove : null,
            weight_changes: payload.weightChanges.trim() || null,
            theme_reasoning: payload.themeReasoning,
          })
        : supabase.from("theme_idea_submissions").insert({
          user_id: userId,
          kind: "theme_in_group",
          submitter_email: payload.submitterEmail,
          status: "submitted",
          group_slug: payload.groupSlug,
          group_name: payload.groupName,
          proposed_theme_name: payload.themeName,
          tickers: payload.tickers,
          theme_reasoning: payload.themeReasoning,
        });

  const { data, error } = await insert.select("id").single();

  if (error) {
    const hint =
      error.code === "42P01"
        ? " Run supabase/migrations/003_theme_idea_submissions.sql and 004_theme_idea_theme_edit.sql in the Supabase SQL editor."
        : "";
    return {
      ok: false,
      error: `Could not save your suggestion${hint}`.trim(),
    };
  }

  const id = data?.id;
  if (typeof id !== "string") {
    return { ok: false, error: "Could not save your suggestion." };
  }

  return { ok: true, id };
}
