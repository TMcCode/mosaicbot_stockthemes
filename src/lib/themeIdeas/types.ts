export type ThemeIdeaSubmissionStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "duplicate";

export type ThemeIdeaSubmissionRow = {
  id: string;
  kind: "new_group" | "theme_in_group";
  status: ThemeIdeaSubmissionStatus;
  proposed_group_name: string | null;
  proposed_theme_name: string | null;
  group_name: string | null;
  published_theme_slug: string | null;
  published_group_slug: string | null;
  created_at: string;
};
