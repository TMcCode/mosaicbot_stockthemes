import { getBrowserSupabase } from "@/lib/supabase/browserClient";

import type { ThemeIdeaSubmissionRow } from "@/lib/themeIdeas/types";

const SELECT_COLUMNS =
  "id, kind, status, proposed_group_name, proposed_theme_name, group_name, published_theme_slug, published_group_slug, created_at";

export async function fetchMyThemeIdeaSubmissions(
  userId: string,
): Promise<{ rows: ThemeIdeaSubmissionRow[]; error: string | null }> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { rows: [], error: null };
  }

  const { data, error } = await supabase
    .from("theme_idea_submissions")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    const hint =
      error.code === "42P01"
        ? " Theme suggestions storage is not set up yet."
        : "";
    return { rows: [], error: `Could not load your submissions.${hint}` };
  }

  return { rows: (data ?? []) as ThemeIdeaSubmissionRow[], error: null };
}
